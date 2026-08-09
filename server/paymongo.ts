import { createHmac, timingSafeEqual } from "node:crypto";

const PAYMONGO_API = "https://api.paymongo.com/v1";

function authHeader(): string {
  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret) throw new Error("PAYMONGO_SECRET_KEY must be set");
  return "Basic " + Buffer.from(`${secret}:`).toString("base64");
}

export type CheckoutLineItem = {
  name: string;
  amount: number; // centavos
  currency: "PHP";
  quantity: number;
  images?: string[];
};

export type CreateCheckoutSessionParams = {
  lineItems: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  description: string;
  billing: { name: string; email: string; phone: string };
  metadata: Record<string, string>;
};

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ id: string; checkoutUrl: string }> {
  const res = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: params.lineItems,
          // qrph is the only channel active on the live account until TIN
          // verification unlocks card/gcash — kept in the list so they start
          // working automatically once PayMongo approves them, no redeploy needed.
          payment_method_types: ["card", "gcash", "qrph"],
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          description: params.description,
          billing: params.billing,
          metadata: params.metadata,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayMongo checkout session creation failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { data: { id: string; attributes: { checkout_url: string } } };
  return { id: json.data.id, checkoutUrl: json.data.attributes.checkout_url };
}

/**
 * Verifies the `Paymongo-Signature` header: `t=<timestamp>,te=<test sig>,li=<live sig>`,
 * each signature being HMAC-SHA256(`${t}.${rawBody}`, webhook secret) as hex.
 * Must be called with the raw (unparsed) request body.
 */
export function verifyPaymongoSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts: Record<string, string> = {};
  for (const pair of signatureHeader.split(",")) {
    const [key, value] = pair.split("=");
    if (key && value) parts[key] = value;
  }
  const timestamp = parts.t;
  const candidates = [parts.te, parts.li].filter((v): v is string => Boolean(v));
  if (!timestamp || candidates.length === 0) return false;

  const expectedHex = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");

  return candidates.some((candidate) => {
    const candidateBuf = Buffer.from(candidate, "hex");
    return candidateBuf.length === expectedBuf.length && timingSafeEqual(expectedBuf, candidateBuf);
  });
}
