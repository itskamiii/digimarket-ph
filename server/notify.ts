import type { PaymentPlan, ShippingAddress, ShippingMethod } from "./types.js";

const peso = (n: number) => "₱" + n.toLocaleString("en-PH");
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

// What the owner still needs to do by hand for this order. LBC needs nothing special
// either way (COD is standard courier procedure; online has nothing left to arrange) —
// everything else needs manual follow-up regardless of payment path, since Lalamove
// booking and DHL rate-quoting are never automated, and Meet up/Pick up are always
// arranged fresh over DM.
function courierActionNeeded(shippingMethod: ShippingMethod, fulfillmentMethod: "online" | "cod"): string | null {
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

function payBalanceLink(orderId: string): string {
  const siteUrl = process.env.SITE_URL ?? "";
  return `${siteUrl}/?payBalance=${orderId}`;
}

function verifyLink(orderId: string): string {
  const siteUrl = process.env.SITE_URL ?? "";
  return `${siteUrl}/api/checkout/verify?order=${orderId}`;
}

function verifyBalanceLink(orderId: string): string {
  const siteUrl = process.env.SITE_URL ?? "";
  return `${siteUrl}/api/checkout/verify?order=${orderId}&balance=1`;
}

// PayMongo used to confirm online payment automatically via webhook — now the customer
// attaches a screenshot/receipt at checkout and the owner has to actually look at it
// before the sale is real. One-click link flips the order to "paid" (and, for a
// non-layaway order, marks the unit sold) once they've checked it against their own
// GCash/Maya/bank app.
function proofVerificationActionNeeded(orderId: string, signedUrl: string | null): string {
  const viewProof = signedUrl ? `View proof: ${signedUrl}. ` : "Proof image failed to load a signed URL — check the order's proof_of_payment_url column directly in Supabase. ";
  return `Payment claimed but NOT yet verified — check it against your GCash/Maya/bank app before treating this as sold. ${viewProof}Once confirmed: ${verifyLink(orderId)}`;
}

// Layaway's balance is never collected automatically — this always needs a human to send
// the customer their pay-balance link and follow up before the deadline, on top of
// whatever the courier itself needs (and on top of verifying the down payment proof —
// see proofVerificationActionNeeded, always shown alongside this for a layaway order).
function layawayActionNeeded(orderId: string, balancePhp: number, dueAt: string): string {
  return `Layaway — once the down payment is verified, balance of ${peso(balancePhp)} is due by ${formatDate(dueAt)}: send the customer their pay-balance link (${payBalanceLink(orderId)}) and follow up before the deadline.`;
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
  paymentPlan: PaymentPlan;
  layawayBalancePhp?: number | null;
  layawayBalanceDueAt?: string | null;
  nativeLanguage?: string | null;
  // Signed URL to the customer's uploaded proof of payment — only set (and only
  // meaningful) when fulfillmentMethod is "online". Null means either this is a COD
  // order (no proof involved) or signing the URL itself failed (see the fallback text
  // in proofVerificationActionNeeded).
  proofOfPaymentSignedUrl?: string | null;
}): Promise<void> {
  const addr = params.shippingAddress;
  const shippingLine = [addr.line1, addr.line2, addr.city, addr.province, addr.postalCode]
    .filter(Boolean)
    .join(", ");
  const itemsLine = params.items.map((i) => `${i.quantity}x ${i.name} (${peso(i.price)})`).join("; ");
  const isLayaway = params.paymentPlan === "layaway" && params.layawayBalancePhp != null && params.layawayBalanceDueAt;
  const action = [
    params.fulfillmentMethod === "online"
      ? proofVerificationActionNeeded(params.orderId, params.proofOfPaymentSignedUrl ?? null)
      : null,
    isLayaway ? layawayActionNeeded(params.orderId, params.layawayBalancePhp!, params.layawayBalanceDueAt!) : null,
    courierActionNeeded(params.shippingMethod, params.fulfillmentMethod),
  ]
    .filter((note): note is string => note !== null)
    .join(" ");
  const collectedNow = isLayaway ? params.totalPhp - params.layawayBalancePhp! : params.totalPhp;

  await sendToFormspree(
    {
      _subject: isLayaway
        ? `New layaway order (${params.shippingMethod}) — ${peso(collectedNow)} today, ${peso(params.layawayBalancePhp!)} balance — NOT YET VERIFIED`
        : `New ${params.fulfillmentMethod === "cod" ? "manual-pay" : "paid via QR"} order (${params.shippingMethod}) — ${peso(params.totalPhp)}${params.fulfillmentMethod === "online" ? " — NOT YET VERIFIED" : ""}`,
      _replyto: params.customerEmail,
      orderId: params.orderId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      shippingAddress: shippingLine,
      fulfillmentMethod: params.fulfillmentMethod,
      shippingMethod: params.shippingMethod,
      paymentPlan: params.paymentPlan,
      items: itemsLine,
      total: peso(params.totalPhp),
      // Only included when they actually picked one — an absent field reads better in
      // Formspree's table than an empty/"unknown" column on every domestic order.
      ...(params.nativeLanguage ? { nativeLanguage: params.nativeLanguage } : {}),
      ...(action ? { actionNeeded: action } : {}),
    },
    "new-order notification"
  );
}

// The customer submitted proof for their layaway balance — same "needs a human to check
// it" gap as the down payment, via PayBalance.tsx instead of Checkout.tsx.
export async function notifyLayawayBalanceSubmitted(params: {
  orderId: string;
  customerName: string;
  balancePhp: number;
  signedUrl: string | null;
}): Promise<void> {
  const viewProof = params.signedUrl
    ? `View proof: ${params.signedUrl}. `
    : "Proof image failed to load a signed URL — check the order's layaway_balance_proof_url column directly in Supabase. ";
  await sendToFormspree(
    {
      _subject: `Layaway balance payment claimed (${peso(params.balancePhp)}) — NOT YET VERIFIED`,
      orderId: params.orderId,
      customerName: params.customerName,
      actionNeeded: `Balance payment claimed but NOT yet verified — check it against your GCash/Maya/bank app. ${viewProof}Once confirmed: ${verifyBalanceLink(params.orderId)}`,
    },
    "layaway-balance-submitted notification"
  );
}

// The balance cleared — order is now fully paid off and the unit's been marked sold.
// Nothing further is automated (packing/shipping is still on the owner), but there's no
// more money to collect.
export async function notifyLayawayBalancePaid(params: { orderId: string; customerName: string }): Promise<void> {
  await sendToFormspree(
    {
      _subject: `Layaway balance paid in full — order ready to fulfill`,
      orderId: params.orderId,
      customerName: params.customerName,
      note: "The remaining layaway balance just cleared and the unit is marked sold. Nothing left to collect — go ahead and arrange fulfillment.",
    },
    "layaway-balance-paid notification"
  );
}

// Daily digest for the reminder cron (api/cron/layaway-reminders.ts) — one email listing
// every layaway order whose balance is due soon or already overdue, rather than one email
// per order. Skips sending entirely if there's nothing to flag.
export async function notifyLayawayReminders(
  orders: { orderId: string; customerName: string; balancePhp: number; dueAt: string; overdue: boolean }[]
): Promise<void> {
  if (orders.length === 0) return;
  const overdueCount = orders.filter((o) => o.overdue).length;
  const lines = orders
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map(
      (o) =>
        `${o.overdue ? "OVERDUE" : "Due soon"} — ${formatDate(o.dueAt)} — ${o.customerName} — ${peso(o.balancePhp)} — ${payBalanceLink(o.orderId)} (order ${o.orderId})`
    )
    .join("\n");

  await sendToFormspree(
    {
      _subject: `Layaway balances: ${overdueCount} overdue, ${orders.length - overdueCount} due soon`,
      note: lines,
    },
    "layaway-reminders digest"
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
