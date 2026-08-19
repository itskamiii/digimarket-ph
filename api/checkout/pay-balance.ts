import { getOrderById, submitLayawayBalanceProof } from "../../server/db.js";
import { notifyLayawayBalanceSubmitted } from "../../server/notify.js";
import { getPaymentProofSignedUrl } from "../../server/paymentProofs.js";
import { allowCheckoutAttempt, getClientIp } from "../../server/rateLimit.js";

// Records a layaway balance payment claim — the customer has already uploaded proof via
// POST /api/checkout/upload-proof and includes the resulting path here. Doesn't clear the
// balance itself (that only happens once the owner verifies it via the link in their
// notification email, see api/checkout/verify.ts) — this just files the claim and alerts
// the owner, same "committed but unverified" pattern as a fresh online order.
export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  if (!(await allowCheckoutAttempt(clientIp))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { orderId?: string; proofOfPaymentUrl?: string };
  try {
    body = (await request.json()) as { orderId?: string; proofOfPaymentUrl?: string };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderId = body.orderId;
  const proofOfPaymentUrl = body.proofOfPaymentUrl?.trim();
  if (!orderId) {
    return Response.json({ error: "missing_order_id" }, { status: 400 });
  }
  if (!proofOfPaymentUrl) {
    return Response.json({ error: "missing_proof_of_payment" }, { status: 400 });
  }

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    if (order.payment_plan !== "layaway" || order.status !== "paid") {
      // Not a layaway order, or its own down payment hasn't been verified yet — there's
      // nothing valid to claim a balance payment against.
      return Response.json({ error: "no_balance_due" }, { status: 400 });
    }
    if (!order.layaway_balance_php || order.layaway_balance_php <= 0) {
      return Response.json({ error: "already_paid" }, { status: 400 });
    }

    const recorded = await submitLayawayBalanceProof(orderId, proofOfPaymentUrl);
    if (!recorded) {
      // Same eligibility check as above, re-run atomically inside the UPDATE — covers a
      // race where the balance cleared between the read above and this write.
      return Response.json({ error: "already_paid" }, { status: 400 });
    }

    const signedUrl = await getPaymentProofSignedUrl(proofOfPaymentUrl);
    await notifyLayawayBalanceSubmitted({
      orderId,
      customerName: order.customer_name,
      balancePhp: order.layaway_balance_php,
      signedUrl,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/checkout/pay-balance failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}