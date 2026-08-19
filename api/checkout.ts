import {
  deleteOrder,
  getKitsByIds,
  getUnitsByIds,
  insertOrder,
  insertOrderItems,
  releaseUnitsForOrder,
  reserveUnits,
  type NewOrderItemInput,
} from "../server/db.js";
import { notifyNewOrder } from "../server/notify.js";
import { getPaymentProofSignedUrl } from "../server/paymentProofs.js";
import { allowCheckoutAttempt, getClientIp } from "../server/rateLimit.js";
import type { CheckoutItemInput, CheckoutRequestBody, PaymentPlan, ShippingAddress } from "../server/types.js";

// A 5% reservation fee is added ON TOP of the subtotal to get the New Total, then the
// down payment due today is 30% of that fee-inclusive New Total (not 30% of the plain
// subtotal) — the balance is whatever's left of the New Total. All done in integer
// centavos so downPayment + balance always reconciles to exactly the New Total (no
// stray centavo from rounding each piece independently).
const LAYAWAY_FEE_PCT = 0.05;
const LAYAWAY_DOWN_PAYMENT_PCT = 0.3;
const LAYAWAY_BALANCE_WINDOW_DAYS = 30;

function computeLayawaySplit(subtotalPhp: number): {
  reservationFeePhp: number;
  newTotalPhp: number;
  downPaymentPhp: number;
  downPaymentCentavos: number;
  balancePhp: number;
} {
  const subtotalCentavos = Math.round(subtotalPhp * 100);
  const feeCentavos = Math.round(subtotalCentavos * LAYAWAY_FEE_PCT);
  const newTotalCentavos = subtotalCentavos + feeCentavos;
  const downPaymentCentavos = Math.round(newTotalCentavos * LAYAWAY_DOWN_PAYMENT_PCT);
  return {
    reservationFeePhp: feeCentavos / 100,
    newTotalPhp: newTotalCentavos / 100,
    downPaymentPhp: downPaymentCentavos / 100,
    downPaymentCentavos,
    balancePhp: (newTotalCentavos - downPaymentCentavos) / 100,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Display-only field — the owner reads it to decide what language to reply in, and no
// logic anywhere keys off it. So a bad value can't do anything worse than look odd in an
// email, and it's dropped rather than 400'd (never fail a real sale over a cosmetic
// field). Only the shape is enforced: a short plain string.
function cleanNativeLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 40) return null;
  return trimmed;
}

function isValidShipping(value: unknown): value is ShippingAddress {
  if (!value || typeof value !== "object") return false;
  const addr = value as Record<string, unknown>;
  return (
    typeof addr.line1 === "string" &&
    addr.line1.trim().length > 0 &&
    typeof addr.city === "string" &&
    addr.city.trim().length > 0 &&
    typeof addr.province === "string" &&
    addr.province.trim().length > 0 &&
    typeof addr.postalCode === "string" &&
    addr.postalCode.trim().length > 0 &&
    (addr.line2 === undefined || typeof addr.line2 === "string")
  );
}

async function rollbackOrder(orderId: string): Promise<void> {
  await releaseUnitsForOrder(orderId).catch((err) => console.error("rollback: release units failed", err));
  await deleteOrder(orderId).catch((err) => console.error("rollback: delete order failed", err));
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  if (!(await allowCheckoutAttempt(clientIp))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: CheckoutRequestBody;
  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return Response.json({ error: "empty_cart" }, { status: 400 });
  }

  const customer = body.customer;
  if (!customer?.name?.trim() || !isValidEmail(customer.email ?? "") || !customer.phone?.trim()) {
    return Response.json({ error: "invalid_customer" }, { status: 400 });
  }
  if (!isValidShipping(body.shipping)) {
    return Response.json({ error: "invalid_shipping" }, { status: 400 });
  }
  if (body.fulfillmentMethod !== "online" && body.fulfillmentMethod !== "cod") {
    return Response.json({ error: "invalid_fulfillment_method" }, { status: 400 });
  }

  const paymentPlan: PaymentPlan = body.paymentPlan ?? "full";
  if (paymentPlan !== "full" && paymentPlan !== "layaway") {
    return Response.json({ error: "invalid_payment_plan" }, { status: 400 });
  }
  if (paymentPlan === "layaway" && body.fulfillmentMethod !== "online") {
    // The down payment is always paid now, via QR + proof of payment — this takes
    // precedence over any courier's own payment-path rules (e.g. Meet up/Pick up
    // normally force "cod", but a layaway down payment on those still needs proof first).
    return Response.json({ error: "layaway_requires_online_payment" }, { status: 400 });
  }
  if (body.fulfillmentMethod === "online" && !body.proofOfPaymentUrl?.trim()) {
    // "online" now means "paid via QR, proof attached" rather than a PayMongo redirect —
    // the client must have already called POST /api/checkout/upload-proof first.
    return Response.json({ error: "missing_proof_of_payment" }, { status: 400 });
  }

  const nativeLanguage = cleanNativeLanguage(body.nativeLanguage);

  const shippingMethod = body.shippingMethod ?? "lbc";
  if (!["lbc", "lalamove", "dhl", "meetup", "pickup"].includes(shippingMethod)) {
    return Response.json({ error: "invalid_shipping_method" }, { status: 400 });
  }
  if (shippingMethod === "lalamove") {
    // Lalamove is NCR-only regardless of payment path. The delivery fee itself is never
    // charged through the site either way — always settled via DM, booked manually on
    // the owner's phone — "online" only ever prepays the item.
    if (body.shipping.province !== "Metro Manila") {
      return Response.json({ error: "lalamove_ncr_only" }, { status: 400 });
    }
    if (
      !body.dropoffPin ||
      typeof body.dropoffPin.lat !== "number" ||
      typeof body.dropoffPin.lng !== "number"
    ) {
      return Response.json({ error: "invalid_dropoff_pin" }, { status: 400 });
    }
  }
  if (
    paymentPlan !== "layaway" &&
    (shippingMethod === "meetup" || shippingMethod === "pickup") &&
    body.fulfillmentMethod !== "cod"
  ) {
    // No courier involved at all — always settled in person as cash or fund transfer,
    // never prepaid via QR. Layaway is the one exception: its down payment still needs
    // proof of payment even for an otherwise in-person exchange.
    return Response.json({ error: "in_person_requires_manual_payment" }, { status: 400 });
  }

  const unitItems = items.filter((i): i is CheckoutItemInput => i.type === "unit");
  const kitItems = items.filter((i): i is CheckoutItemInput => i.type === "kit");

  // Never trust client-submitted prices/availability — re-fetch from the DB.
  const [units, kits] = await Promise.all([
    getUnitsByIds(unitItems.map((i) => i.id)),
    getKitsByIds(kitItems.map((i) => i.id)),
  ]);
  const unitById = new Map(units.map((u) => [u.id, u]));
  const kitById = new Map(kits.map((k) => [k.id, k]));

  const unavailableUnitIds = unitItems
    .map((i) => i.id)
    .filter((id) => unitById.get(id)?.status === "sold" || !unitById.has(id));
  const missingKitIds = kitItems.map((i) => i.id).filter((id) => !kitById.has(id));
  if (unavailableUnitIds.length > 0 || missingKitIds.length > 0) {
    return Response.json(
      { error: "unavailable", unavailableItems: [...unavailableUnitIds, ...missingKitIds] },
      { status: 409 }
    );
  }

  const orderItems: NewOrderItemInput[] = [
    ...unitItems.map((i) => {
      const unit = unitById.get(i.id)!;
      return { itemType: "unit" as const, unitId: unit.id, name: unit.name, price: unit.price_php, quantity: 1 };
    }),
    ...kitItems.map((i) => {
      const kit = kitById.get(i.id)!;
      const quantity = Math.min(Math.max(Math.trunc(i.quantity ?? 1), 1), 5);
      return { itemType: "kit" as const, kitId: kit.id, name: kit.name, price: kit.price_php, quantity };
    }),
  ];
  const subtotalPhp = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Lalamove's actual delivery fee is never charged through the site regardless of
  // payment path — always settled via DM, booked manually on the owner's phone. "lbc"
  // and "dhl" stay 0 for the same reason (weight/distance-dependent, relayed via DM).
  // "pickup" genuinely has no fee. Only "meetup" contributes a real, known-upfront fee.
  let shippingFeePhp = 0;
  if (shippingMethod === "meetup") {
    // Flat meet-up fee, collected in person — cheaper within Rizal (where the business
    // is based, in Cainta) than further out. No fee at all for "pickup".
    shippingFeePhp = body.shipping.province === "Rizal" ? 250 : 300;
  }

  const layawaySplit = paymentPlan === "layaway" ? computeLayawaySplit(subtotalPhp) : null;
  const layawayBalanceDueAt =
    paymentPlan === "layaway"
      ? new Date(Date.now() + LAYAWAY_BALANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const order = await insertOrder({
    customerName: customer.name.trim(),
    customerEmail: customer.email.trim(),
    customerPhone: customer.phone.trim(),
    shippingAddress: body.shipping,
    fulfillmentMethod: body.fulfillmentMethod,
    subtotalPhp,
    // Full-payment total is just subtotal + shipping; layaway's is the fee-inclusive
    // New Total + shipping (total_php always reflects the FULL order value either way).
    totalPhp: (layawaySplit ? layawaySplit.newTotalPhp : subtotalPhp) + shippingFeePhp,
    status: body.fulfillmentMethod === "cod" ? "cod_pending" : "pending_verification",
    shippingMethod,
    shippingFeePhp,
    dropoffLat: shippingMethod === "lalamove" ? body.dropoffPin!.lat : null,
    dropoffLng: shippingMethod === "lalamove" ? body.dropoffPin!.lng : null,
    paymentPlan,
    layawayBalancePhp: layawaySplit?.balancePhp,
    layawayBalanceDueAt,
    nativeLanguage,
    proofOfPaymentUrl: body.fulfillmentMethod === "online" ? body.proofOfPaymentUrl!.trim() : null,
  });

  try {
    await insertOrderItems(order.id, orderItems);

    // Physical units are one-of-a-kind and must be claimed atomically; kits aren't
    // inventory-constrained (the owner picks a physical camera to fulfil it later). Every
    // order is a committed sale at creation time now — online payment used to be a
    // short-TTL hold pending a PayMongo redirect, but "online" now means "proof of
    // payment already attached," so it holds the unit indefinitely just like COD/layaway.
    const unitIds = unitItems.map((i) => i.id);
    if (unitIds.length > 0) {
      const { missingIds } = await reserveUnits(unitIds, order.id, { indefinite: true });
      if (missingIds.length > 0) {
        await rollbackOrder(order.id);
        return Response.json({ error: "unavailable", unavailableItems: missingIds }, { status: 409 });
      }
    }

    // Nothing here waits on a payment-gateway webhook anymore — every path is a
    // committed sale the instant it's submitted, so every path notifies right here.
    const proofSignedUrl =
      body.fulfillmentMethod === "online" ? await getPaymentProofSignedUrl(body.proofOfPaymentUrl!.trim()) : null;

    await notifyNewOrder({
      orderId: order.id,
      customerName: customer.name.trim(),
      customerEmail: customer.email.trim(),
      customerPhone: customer.phone.trim(),
      shippingAddress: body.shipping,
      fulfillmentMethod: body.fulfillmentMethod,
      shippingMethod,
      paymentPlan,
      layawayBalancePhp: layawaySplit?.balancePhp,
      layawayBalanceDueAt,
      items: orderItems.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
      totalPhp: order.total_php,
      nativeLanguage,
      proofOfPaymentSignedUrl: proofSignedUrl,
    });
    return Response.json({ orderId: order.id, redirect: null });
  } catch (err) {
    console.error("POST /api/checkout failed after order creation", err);
    await rollbackOrder(order.id);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
