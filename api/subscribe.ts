import { addSubscriber } from "../server/db.js";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    await addSubscriber(email);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/subscribe failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}