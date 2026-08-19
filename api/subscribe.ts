import { addSubscriber, removeSubscriber } from "../server/db.js";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Display-only (same as on orders — see api/checkout.ts): dropped rather than rejected if
// it's the wrong shape, since a cosmetic field must never block a real signup.
function cleanNativeLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 40) return null;
  return trimmed;
}

// Subscribe and unsubscribe share one function (action: "subscribe" | "unsubscribe" in the
// body) rather than two files — Vercel's Hobby plan caps serverless functions per
// deployment at 12, and this project was right at that ceiling.
export async function POST(request: Request) {
  let body: { email?: string; nativeLanguage?: string; action?: string };
  try {
    body = (await request.json()) as { email?: string; nativeLanguage?: string; action?: string };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    if (body.action === "unsubscribe") {
      await removeSubscriber(email);
      // Always ok, whether or not that email was actually on the list — see removeSubscriber.
    } else {
      await addSubscriber(email, cleanNativeLanguage(body.nativeLanguage));
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`POST /api/subscribe (${body.action ?? "subscribe"}) failed`, err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}