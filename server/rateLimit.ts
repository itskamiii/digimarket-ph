import { getSupabase } from "./supabase.js";

const WINDOW_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function getClientIp(request: Request): string {
  // Vercel sets x-forwarded-for as "client, proxy1, proxy2, ..." — the first entry is
  // the original client. Falls back to a constant bucket if truly unavailable (better
  // than crashing, and still rate-limits — just as one shared bucket for those requests).
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Caps checkout attempts per IP so one-of-a-kind inventory can't be perpetually
// re-reserved forever by an unauthenticated, unlimited stream of checkout calls. Fails
// OPEN on any error checking/recording — a broken rate limiter must never be able to
// block a real customer from buying something.
export async function allowCheckoutAttempt(ip: string): Promise<boolean> {
  const supabase = getSupabase();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from("checkout_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", windowStart);
  if (countError) {
    console.error("Checkout rate-limit check failed — allowing request", countError);
    return true;
  }
  if ((count ?? 0) >= MAX_ATTEMPTS) return false;

  const { error: insertError } = await supabase.from("checkout_attempts").insert({ ip_address: ip });
  if (insertError) console.error("Failed to record checkout attempt", insertError);
  return true;
}
