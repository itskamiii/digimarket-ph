import { getSupabase } from "./supabase.js";

// Customer-uploaded proof-of-payment screenshots/receipts — kept in a PRIVATE bucket
// (unlike unit-photos) since these can show partial account numbers, names, or
// transaction IDs. Only ever accessed via short-lived signed URLs generated server-side
// for the owner's notification email — never a public URL, never rendered client-side.
const BUCKET = "payment-proofs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — generous for a phone screenshot or scanned receipt

export function isAllowedProofType(contentType: string): boolean {
  return ALLOWED_TYPES.has(contentType);
}

export const MAX_PROOF_BYTES = MAX_BYTES;

// Random filename (not tied to any order — the order doesn't exist yet when this runs,
// see api/checkout/upload-proof.ts) so nothing about the path leaks customer info.
export async function uploadPaymentProof(bytes: Uint8Array, contentType: string): Promise<string> {
  const ext = contentType === "application/pdf" ? "pdf" : contentType.split("/")[1];
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

// 30 days — generous since the owner may not check email same-day, and this link only
// ever goes out in an email to the owner's own inbox, never shown to the customer.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function getPaymentProofSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error("getPaymentProofSignedUrl failed", error);
    return null;
  }
  return data.signedUrl;
}