import { getOrderById, getOrderItemsByOrderId } from "../server/db.js";

// Deliberately minimal — no full address/phone, this endpoint is unauthenticated and
// reachable by anyone with the order id (an unguessable UUID, same trust model as
// api/order-status.ts).
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) {
    return Response.json({ error: "missing_order_id" }, { status: 400 });
  }

  try {
    const order = await getOrderById(orderId);
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
  } catch (err) {
    console.error("GET /api/pay-balance-status failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}