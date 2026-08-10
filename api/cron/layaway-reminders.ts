import { getOutstandingLayawayOrders } from "../../server/db.js";
import { notifyLayawayReminders } from "../../server/notify.js";

const REMIND_WITHIN_DAYS = 7;

// Vercel invokes this daily (see vercel.json) with an Authorization header matching
// CRON_SECRET — set that env var in Vercel so this can't be triggered by anyone else
// (it doesn't charge anything, but there's no reason to let it be spammed).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  try {
    const orders = await getOutstandingLayawayOrders();
    const now = Date.now();
    const remindWindowMs = REMIND_WITHIN_DAYS * 24 * 60 * 60 * 1000;

    const dueSoonOrOverdue = orders
      .filter((o) => o.layaway_balance_due_at)
      .map((o) => ({
        orderId: o.id,
        customerName: o.customer_name,
        balancePhp: o.layaway_balance_php!,
        dueAt: o.layaway_balance_due_at!,
        overdue: new Date(o.layaway_balance_due_at!).getTime() < now,
      }))
      .filter((o) => o.overdue || new Date(o.dueAt).getTime() - now <= remindWindowMs);

    await notifyLayawayReminders(dueSoonOrOverdue);

    return Response.json({ checked: orders.length, flagged: dueSoonOrOverdue.length });
  } catch (err) {
    console.error("GET /api/cron/layaway-reminders failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}