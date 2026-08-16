import { addSubscriber } from "../server/db.js";

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

export async function POST(request: Request) {
  let body: { email?: string; nativeLanguage?: string };
  try {
    body = (await request.json()) as { email?: string; nativeLanguage?: string };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    await addSubscriber(email, cleanNativeLanguage(body.nativeLanguage));
    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/subscribe failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}