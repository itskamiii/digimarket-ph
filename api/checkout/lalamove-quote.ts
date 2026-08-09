import { getQuotation } from "../../server/lalamove.js";
import { allowCheckoutAttempt, getClientIp } from "../../server/rateLimit.js";

type QuoteRequestBody = {
  dropoffPin?: { lat: number; lng: number };
  address?: string;
};

// Customer-facing: lets the checkout page show a real Lalamove fee before the customer
// commits to paying. This quotation is display-only and expires in ~5 minutes — the order
// endpoint (api/checkout.ts) always fetches its own fresh quotation at submit time rather
// than trusting whatever fee this endpoint returned, since a customer can sit on the
// checkout form for longer than that.
export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  if (!(await allowCheckoutAttempt(clientIp))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: QuoteRequestBody;
  try {
    body = (await request.json()) as QuoteRequestBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const pin = body.dropoffPin;
  if (!pin || typeof pin.lat !== "number" || typeof pin.lng !== "number" || !body.address?.trim()) {
    return Response.json({ error: "invalid_dropoff" }, { status: 400 });
  }

  try {
    const quotation = await getQuotation({ lat: pin.lat, lng: pin.lng, address: body.address.trim() });
    return Response.json({ feePhp: quotation.priceTotal, expiresAt: quotation.expiresAt });
  } catch (err) {
    console.error("POST /api/checkout/lalamove-quote failed", err);
    return Response.json({ error: "quote_unavailable" }, { status: 502 });
  }
}
