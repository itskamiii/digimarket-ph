import { isMetroManila } from "../server/constants";
import {
  attachPaymongoSession,
  deleteOrder,
  getKitsByIds,
  getUnitsByIds,
  insertOrder,
  insertOrderItems,
  releaseUnitsForOrder,
  reserveUnits,
  type NewOrderItemInput,
} from "../server/db";
import { createCheckoutSession } from "../server/paymongo";
import type { CheckoutItemInput, CheckoutRequestBody, ShippingAddress } from "../server/types";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
  if (body.fulfillmentMethod === "cod" && !isMetroManila(body.shipping.city)) {
    return Response.json({ error: "cod_requires_metro_manila" }, { status: 400 });
  }
  const installmentPlan = body.installmentPlan === "3x" ? "3x" : "full";

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

  const order = await insertOrder({
    customerName: customer.name.trim(),
    customerEmail: customer.email.trim(),
    customerPhone: customer.phone.trim(),
    shippingAddress: body.shipping,
    fulfillmentMethod: body.fulfillmentMethod,
    installmentPlan,
    subtotalPhp,
    status: body.fulfillmentMethod === "cod" ? "cod_pending" : "pending_payment",
  });

  try {
    await insertOrderItems(order.id, orderItems);

    // Physical units are one-of-a-kind and must be claimed atomically; kits aren't
    // inventory-constrained (the owner picks a physical camera to fulfil it later).
    const unitIds = unitItems.map((i) => i.id);
    if (unitIds.length > 0) {
      const { missingIds } = await reserveUnits(unitIds, order.id);
      if (missingIds.length > 0) {
        await rollbackOrder(order.id);
        return Response.json({ error: "unavailable", unavailableItems: missingIds }, { status: 409 });
      }
    }

    if (body.fulfillmentMethod === "cod") {
      return Response.json({ orderId: order.id, redirect: null });
    }

    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) throw new Error("SITE_URL is not set");

    const session = await createCheckoutSession({
      lineItems: orderItems.map((item) => ({
        name: item.name,
        amount: item.price * 100,
        currency: "PHP",
        quantity: item.quantity,
      })),
      successUrl: `${siteUrl}/?order=${order.id}&status=success`,
      // Routed through a cleanup endpoint (not straight back to the site) so an explicit
      // cancel immediately frees the reserved units instead of waiting out the TTL —
      // otherwise an instant retry would collide with the customer's own abandoned order.
      cancelUrl: `${siteUrl}/api/checkout/cancel?order=${order.id}`,
      description: `Digimarket_PH order ${order.id}`,
      billing: { name: customer.name.trim(), email: customer.email.trim(), phone: customer.phone.trim() },
      metadata: { order_id: order.id },
    });
    await attachPaymongoSession(order.id, session.id, null);

    return Response.json({ orderId: order.id, redirect: session.checkoutUrl });
  } catch (err) {
    console.error("POST /api/checkout failed after order creation", err);
    await rollbackOrder(order.id);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
