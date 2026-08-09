import { getOrderByLalamoveOrderId, updateLalamoveStatus } from "../../server/db.js";
import { verifyLalamoveWebhookSignature } from "../../server/lalamove.js";

// Lalamove's Partner Portal lets the owner register one webhook URL per market and
// sends events like ORDER_STATUS_CHANGED, DRIVER_ASSIGNED, POD_STATUS_CHANGED. The exact
// header name for the signature and the precise payload nesting below are best-effort
// from Lalamove's public docs, NOT yet confirmed against a real delivery (same caveat as
// PayMongo's payment_method_used field elsewhere in this codebase) — once the owner
// registers this URL in their sandbox Partner Portal and triggers a real test order, log
// one raw payload and adjust the header name / field paths here if they don't match.
type LalamoveWebhookEvent = {
  eventType?: string;
  eventId?: string;
  data?: {
    order?: {
      orderId?: string;
      status?: string;
      shareLink?: string;
    };
  };
};

const SIGNATURE_HEADER_CANDIDATES = ["x-llm-signature", "x-lalamove-signature"];

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = SIGNATURE_HEADER_CANDIDATES.map((h) => request.headers.get(h)).find(Boolean) ?? null;

  if (!verifyLalamoveWebhookSignature(rawBody, signature)) {
    console.warn("Rejected Lalamove webhook: signature verification failed");
    return new Response("invalid signature", { status: 400 });
  }

  let event: LalamoveWebhookEvent;
  try {
    event = JSON.parse(rawBody) as LalamoveWebhookEvent;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const lalamoveOrderId = event.data?.order?.orderId;
  const status = event.data?.order?.status;
  if (!lalamoveOrderId || !status) {
    // Unrecognized shape — acknowledge so Lalamove doesn't retry-storm us, but log for
    // the header-name/payload-shape confirmation pass mentioned above.
    console.warn("Lalamove webhook: unrecognized payload shape", rawBody.slice(0, 500));
    return new Response("ok", { status: 200 });
  }

  try {
    const order = await getOrderByLalamoveOrderId(lalamoveOrderId);
    if (!order) {
      console.error("Lalamove webhook: no matching order", { lalamoveOrderId, status });
      return new Response("ok", { status: 200 }); // retrying won't make a missing order appear
    }
    await updateLalamoveStatus(order.id, status);
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("POST /api/webhooks/lalamove failed", err);
    return new Response("internal error", { status: 500 });
  }
}
