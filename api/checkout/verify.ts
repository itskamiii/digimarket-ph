import {
  getOrderById,
  markLayawayBalancePaid,
  markOrderCancelled,
  markUnitsSold,
  releaseUnitsForOrder,
  verifyOrderPayment,
} from "../../server/db.js";
import { notifyLayawayBalancePaid } from "../../server/notify.js";

// The "Verify & Mark Paid" / balance-verify link the owner clicks from the notification
// email after actually checking the proof against their GCash/Maya/bank app — one-click
// on purpose (an emailed link can't carry a bearer header), secured only by the order's
// own unguessable UUID, same trust model already used by order-status.ts. ?balance=1
// verifies a layaway balance claim instead of the down payment.
//
// ?action=cancel also lives here (dormant — was PayMongo's own cancel_url target, hit
// when a customer backed out of the hosted checkout page; nothing generates that link
// anymore since checkout no longer creates PayMongo sessions, but any already-in-flight
// old session still points at this URL). Merged into this file rather than kept
// separate: Vercel's Hobby plan caps serverless functions per deployment at 12, and
// this project was right at that ceiling.
function page(title: string, message: string): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;background:#faf7f0;color:#1b1712;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}main{max-width:28rem}h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#6b6255;line-height:1.5}</style>
</head><body><main><h1>${title}</h1><p>${message}</p></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const orderId = params.get("order");
  const isBalance = params.get("balance") === "1";

  if (params.get("action") === "cancel") {
    const siteUrl = process.env.SITE_URL ?? new URL(request.url).origin;
    if (orderId) {
      await Promise.all([
        releaseUnitsForOrder(orderId).catch((err) => console.error("checkout/verify cancel: release units failed", err)),
        markOrderCancelled(orderId).catch((err) => console.error("checkout/verify cancel: mark cancelled failed", err)),
      ]);
    }
    const redirectUrl = new URL("/", siteUrl);
    redirectUrl.searchParams.set("status", "cancelled");
    if (orderId) redirectUrl.searchParams.set("order", orderId);
    return Response.redirect(redirectUrl.toString(), 302);
  }

  if (!orderId) return page("Missing order", "No order id was given in this link.");

  try {
    const order = await getOrderById(orderId);
    if (!order) return page("Order not found", `No order matches ${orderId}.`);

    if (isBalance) {
      const cleared = await markLayawayBalancePaid(orderId);
      if (!cleared) {
        return page("Already handled", "This layaway balance is already cleared (or there's nothing outstanding) — no change made.");
      }
      await markUnitsSold(orderId);
      await notifyLayawayBalancePaid({ orderId, customerName: order.customer_name });
      return page("Balance verified!", `Order ${orderId} is fully paid and its unit is marked sold.`);
    }

    const verified = await verifyOrderPayment(orderId);
    if (!verified) {
      return page(
        "Already handled",
        order.status === "paid"
          ? "This order is already marked paid — no change made."
          : `This order's status is "${order.status}", not pending verification — check it manually in Supabase if that's unexpected.`
      );
    }
    if (order.payment_plan !== "layaway") {
      await markUnitsSold(orderId);
    }
    return page(
      "Payment verified!",
      order.payment_plan === "layaway"
        ? `Order ${orderId}'s down payment is confirmed. The unit stays reserved until the balance clears too.`
        : `Order ${orderId} is confirmed paid and its unit is marked sold.`
    );
  } catch (err) {
    console.error("GET /api/checkout/verify failed", err);
    return page("Something went wrong", "Check the server logs — this didn't complete cleanly.");
  }
}