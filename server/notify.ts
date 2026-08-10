import type { ShippingAddress, ShippingMethod } from "./types.js";

const peso = (n: number) => "₱" + n.toLocaleString("en-PH");

// What the owner still needs to do by hand for this order. LBC needs nothing special
// either way (COD is standard courier procedure; online has nothing left to arrange) —
// everything else needs manual follow-up regardless of payment path, since Lalamove
// booking and DHL rate-quoting are never automated, and Meet up/Pick up are always
// arranged fresh over DM.
function actionNeeded(shippingMethod: ShippingMethod, fulfillmentMethod: "online" | "cod"): string | null {
  if (shippingMethod === "lalamove") {
    return fulfillmentMethod === "online"
      ? "Item is paid — book the Lalamove delivery yourself using the dropoff pin on this order."
      : "Arrange the fund transfer with the customer, then book the Lalamove delivery yourself using the dropoff pin on this order.";
  }
  if (shippingMethod === "dhl") {
    return fulfillmentMethod === "online"
      ? "Item is paid — message the customer on Instagram to get their destination and quote the DHL shipping rate."
      : "Message the customer on Instagram to arrange payment and quote DHL shipping for their destination.";
  }
  if (shippingMethod === "meetup") {
    return "Message the customer on Instagram to set the meet-up time and place — cash or fund transfer plus the meet-up fee on the day.";
  }
  if (shippingMethod === "pickup") {
    return "Message the customer on Instagram to arrange a pickup time — cash or fund transfer on the day, no extra fee.";
  }
  return null;
}

// Reuses the same Formspree form as the waitlist signup — it's already wired to the
// owner's inbox. Never throws: a notification hiccup must never block a real order.
async function sendToFormspree(fields: Record<string, string>, logLabel: string): Promise<void> {
  const endpoint = process.env.VITE_FORMSPREE_ENDPOINT;
  if (!endpoint) {
    console.error(`VITE_FORMSPREE_ENDPOINT is not set — ${logLabel} skipped`);
    return;
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      console.error(`${logLabel} failed`, res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error(`${logLabel} failed`, err);
  }
}

export async function notifyNewOrder(params: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  fulfillmentMethod: "online" | "cod";
  shippingMethod: ShippingMethod;
  items: { name: string; price: number; quantity: number }[];
  totalPhp: number;
}): Promise<void> {
  const addr = params.shippingAddress;
  const shippingLine = [addr.line1, addr.line2, addr.city, addr.province, addr.postalCode]
    .filter(Boolean)
    .join(", ");
  const itemsLine = params.items.map((i) => `${i.quantity}x ${i.name} (${peso(i.price)})`).join("; ");
  const action = actionNeeded(params.shippingMethod, params.fulfillmentMethod);

  await sendToFormspree(
    {
      _subject: `New ${params.fulfillmentMethod === "cod" ? "manual-pay" : "paid online"} order (${params.shippingMethod}) — ${peso(params.totalPhp)}`,
      _replyto: params.customerEmail,
      orderId: params.orderId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      shippingAddress: shippingLine,
      fulfillmentMethod: params.fulfillmentMethod,
      shippingMethod: params.shippingMethod,
      items: itemsLine,
      total: peso(params.totalPhp),
      ...(action ? { actionNeeded: action } : {}),
    },
    "new-order notification"
  );
}

// A payment confirmed for an order that's no longer "pending_payment" (already paid —
// harmless replay — or, more concerningly, cancelled/expired because its reservation
// timed out before this late confirmation arrived). The order/unit records themselves are
// already safe either way; this exists purely so a human notices the second case, since
// real money came in for a unit that may no longer be held for this customer.
export async function notifyPaymentOnDeadOrder(params: {
  orderId: string;
  orderStatus: string;
  eventType: string;
}): Promise<void> {
  await sendToFormspree(
    {
      _subject: `⚠️ Action needed — payment received for a ${params.orderStatus} order`,
      orderId: params.orderId,
      orderStatus: params.orderStatus,
      eventType: params.eventType,
      note: "PayMongo confirmed a payment for an order that is no longer pending — check whether the unit is still available for this customer, or if a refund is needed.",
    },
    "dead-order payment alert"
  );
}
