import { getOrderById } from "../../server/db.js";
import { createCheckoutSession } from "../../server/paymongo.js";
import { allowCheckoutAttempt, getClientIp } from "../../server/rateLimit.js";

// Creates a real PayMongo charge for exactly a layaway order's outstanding balance —
// a second, separate checkout session from the original down-payment one. The webhook
// (api/webhooks/paymongo.ts) tells this apart from a normal order/down-payment via
// metadata.purpose === "layaway_balance", since the order's own status stays "paid"
// throughout (that already means "the down payment cleared").
export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  if (!(await allowCheckoutAttempt(clientIp))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { orderId?: string };
  try {
    body = (await request.json()) as { orderId?: string };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderId = body.orderId;
  if (!orderId) {
    return Response.json({ error: "missing_order_id" }, { status: 400 });
  }

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    if (order.payment_plan !== "layaway" || order.status !== "paid") {
      // Not a layaway order, or its own down payment never cleared — there's nothing
      // valid to charge a balance against yet.
      return Response.json({ error: "no_balance_due" }, { status: 400 });
    }
    if (!order.layaway_balance_php || order.layaway_balance_php <= 0) {
      return Response.json({ error: "already_paid" }, { status: 400 });
    }

    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) throw new Error("SITE_URL is not set");

    const session = await createCheckoutSession({
      lineItems: [
        {
          name: "Layaway balance",
          amount: order.layaway_balance_php * 100,
          currency: "PHP",
          quantity: 1,
        },
      ],
      successUrl: `${siteUrl}/?payBalance=${order.id}&paid=1`,
      cancelUrl: `${siteUrl}/?payBalance=${order.id}`,
      description: `Digimarket_PH layaway balance — order ${order.id}`,
      billing: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone },
      metadata: { order_id: order.id, purpose: "layaway_balance" },
    });

    return Response.json({ redirect: session.checkoutUrl });
  } catch (err) {
    console.error("POST /api/checkout/pay-balance failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}