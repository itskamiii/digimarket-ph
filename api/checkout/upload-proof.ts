import { isAllowedProofType, MAX_PROOF_BYTES, uploadPaymentProof } from "../../server/paymentProofs.js";
import { allowCheckoutAttempt, getClientIp } from "../../server/rateLimit.js";

// First step of the two-step online-checkout flow: the customer picks a file here and
// gets back a storage path, which they then include in their POST /api/checkout body as
// proofOfPaymentUrl. Kept separate from api/checkout.ts (which stays plain JSON) rather
// than teaching that already-large handler to parse multipart/form-data too.
export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  if (!(await allowCheckoutAttempt(clientIp))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "missing_file" }, { status: 400 });
  }
  if (!isAllowedProofType(file.type)) {
    return Response.json({ error: "unsupported_file_type" }, { status: 400 });
  }
  if (file.size > MAX_PROOF_BYTES) {
    return Response.json({ error: "file_too_large" }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = await uploadPaymentProof(bytes, file.type);
    return Response.json({ path });
  } catch (err) {
    console.error("POST /api/checkout/upload-proof failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}