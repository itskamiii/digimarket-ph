import { markOrderCancelled, releaseUnitsForOrder } from "../../server/db.js";

// PayMongo's cancel_url — hit by the customer's browser (GET) when they explicitly back
// out of the hosted checkout page. Releases their reservation immediately (instead of
// waiting out the TTL) so an instant retry doesn't collide with their own abandoned
// attempt, then bounces back to the site for OrderStatus.tsx to show a message.
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("order");
  const siteUrl = process.env.SITE_URL ?? new URL(request.url).origin;

  if (orderId) {
    await Promise.all([
      releaseUnitsForOrder(orderId).catch((err) => console.error("checkout/cancel: release units failed", err)),
      markOrderCancelled(orderId).catch((err) => console.error("checkout/cancel: mark cancelled failed", err)),
    ]);
  }

  const redirectUrl = new URL("/", siteUrl);
  redirectUrl.searchParams.set("status", "cancelled");
  if (orderId) redirectUrl.searchParams.set("order", orderId);

  return Response.redirect(redirectUrl.toString(), 302);
}
