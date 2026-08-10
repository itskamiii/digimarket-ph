import { getOrderById } from "../server/db.js";

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) {
    return Response.json({ error: "missing_order_id" }, { status: 400 });
  }

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    // Deliberately minimal — no customer PII, this endpoint is unauthenticated.
    return Response.json({
      status: order.status,
      fulfillmentMethod: order.fulfillment_method,
      shippingMethod: order.shipping_method,
      totalPhp: order.total_php,
    });
  } catch (err) {
    console.error("GET /api/order-status failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
