import {
  attachLalamoveOrder,
  getOrderByCheckoutSessionId,
  getOrderById,
  getOrderItemsByOrderId,
  markOrderPaid,
  markUnitsSold,
} from "../../server/db.js";
import { bookLalamoveDelivery, formatDropoffAddress } from "../../server/lalamove.js";
import { notifyLalamoveBookingFailed, notifyNewOrder, notifyPaymentOnDeadOrder } from "../../server/notify.js";
import { verifyPaymongoSignature } from "../../server/paymongo.js";

// PayMongo's webhook envelope: { data: { attributes: { type: "<event>", data: <resource> } } }.
// The exact nesting of `payment_method_used` below is unconfirmed against a live
// payload — verify this once real test webhooks are flowing (see plan §5) and adjust
// if the owner's dashboard shows a different field name; a null payment_method here
// never blocks fulfilment, it's informational only.
type PaymongoWebhookEvent = {
  data?: {
    attributes?: {
      type?: string;
      data?: {
        id?: string;
        attributes?: {
          metadata?: Record<string, string> | null;
          payment_method_used?: string | null;
          payments?: Array<{ attributes?: { source?: { type?: string } } }>;
        };
      };
    };
  };
};

const HANDLED_EVENT_TYPES = new Set(["checkout_session.payment.paid", "payment.paid"]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");

  if (!verifyPaymongoSignature(rawBody, signature)) {
    console.warn("Rejected PayMongo webhook: signature verification failed");
    return new Response("invalid signature", { status: 400 });
  }

  let event: PaymongoWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaymongoWebhookEvent;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const eventType = event.data?.attributes?.type;
  const resource = event.data?.attributes?.data;

  if (!eventType || !HANDLED_EVENT_TYPES.has(eventType)) {
    // e.g. payment.failed — deliberately not released here; a customer can retry a
    // different payment method on the same checkout session. TTL expiry (pg_cron)
    // handles true abandonment. Acknowledge so PayMongo doesn't retry-storm us.
    return new Response("ok", { status: 200 });
  }

  try {
    const orderId = resource?.attributes?.metadata?.order_id;
    const sessionId = resource?.id;
    const order = orderId
      ? await getOrderById(orderId)
      : sessionId
        ? await getOrderByCheckoutSessionId(sessionId)
        : null;

    if (!order) {
      console.error("PayMongo webhook: no matching order", { orderId, sessionId, eventType });
      return new Response("ok", { status: 200 }); // retrying won't make a missing order appear
    }

    const paymentMethod =
      resource?.attributes?.payment_method_used ?? resource?.attributes?.payments?.[0]?.attributes?.source?.type ?? null;

    const newlyPaid = await markOrderPaid(order.id, paymentMethod);
    if (newlyPaid) {
      await markUnitsSold(order.id);
      const orderItems = await getOrderItemsByOrderId(order.id);
      await notifyNewOrder({
        orderId: order.id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddress: order.shipping_address,
        fulfillmentMethod: "online",
        shippingMethod: order.shipping_method,
        items: orderItems.map((i) => ({ name: i.name_snapshot, price: i.price_php_snapshot, quantity: i.quantity })),
        totalPhp: order.total_php,
      });

      if (order.shipping_method === "lalamove" && order.dropoff_lat != null && order.dropoff_lng != null) {
        try {
          const booking = await bookLalamoveDelivery({
            orderId: order.id,
            dropoff: {
              lat: order.dropoff_lat,
              lng: order.dropoff_lng,
              address: formatDropoffAddress(order.shipping_address),
            },
            recipientName: order.customer_name,
            recipientPhone: order.customer_phone,
          });
          await attachLalamoveOrder(order.id, booking.orderId, booking.shareLink, booking.status);
        } catch (err) {
          // The sale itself already succeeded (payment confirmed, unit marked sold) — a
          // failed booking call must never surface as a failed webhook, since PayMongo
          // retrying this event would just re-attempt a no-op markOrderPaid. A human
          // needs to book the delivery manually instead.
          console.error("PayMongo webhook: Lalamove booking failed for a paid order", { orderId: order.id, err });
          await notifyLalamoveBookingFailed({
            orderId: order.id,
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else if (order.status !== "paid") {
      // `order` was fetched before markOrderPaid ran, so its status here reflects what
      // the order was BEFORE this webhook — not "paid" means it was already dead
      // (cancelled/expired) when this payment confirmation arrived. Real money came in
      // for a unit that may no longer be held for this customer; needs a human.
      console.error("PayMongo webhook: payment confirmed for a dead order", {
        orderId: order.id,
        orderStatus: order.status,
        eventType,
      });
      await notifyPaymentOnDeadOrder({ orderId: order.id, orderStatus: order.status, eventType });
    }
    // else: already paid — safe no-op, PayMongo redelivered the event.

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("POST /api/webhooks/paymongo failed", err);
    // Non-200 makes PayMongo retry, which is what we want for a transient failure.
    return new Response("internal error", { status: 500 });
  }
}
