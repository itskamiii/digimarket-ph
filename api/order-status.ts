import { getOrderById, getOrderItemsByOrderId } from "../server/db.js";

// Two lookup shapes share one function (default vs ?view=balance) — Vercel's Hobby plan
// caps serverless functions per deployment at 12, and this project was right at that
// ceiling. Both are unauthenticated, deliberately minimal (no full address/phone/PII),
// and reachable by anyone with the order id — an unguessable UUID, same trust model
// used throughout this project's other id-based lookups.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const orderId = params.get("orderId");
  if (!orderId) {
    return Response.json({ error: "missing_order_id" }, { status: 400 });
  }

  try {
    const order = await getOrderById(orderId);

    if (params.get("view") === "balance") {
      if (!order || order.payment_plan !== "layaway") {
        return Response.json({ error: "not_found" }, { status: 404 });
      }
      const items = await getOrderItemsByOrderId(order.id);
      return Response.json({
        customerName: order.customer_name,
        items: items.map((i) => ({ name: i.name_snapshot, quantity: i.quantity })),
        downPaymentCleared: order.status === "paid",
        balancePhp: order.layaway_balance_php,
        balanceDueAt: order.layaway_balance_due_at,
      });
    }

    if (!order) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json({
      status: order.status,
      fulfillmentMethod: order.fulfillment_method,
      shippingMethod: order.shipping_method,
      totalPhp: order.total_php,
      paymentPlan: order.payment_plan,
      layawayBalancePhp: order.layaway_balance_php,
      layawayBalanceDueAt: order.layaway_balance_due_at,
    });
  } catch (err) {
    console.error("GET /api/order-status failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}