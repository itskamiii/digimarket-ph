import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { LatLng, ShippingAddress } from "./types.js";

export function formatDropoffAddress(shipping: ShippingAddress): string {
  return [shipping.line1, shipping.line2, shipping.city, shipping.province, shipping.postalCode]
    .filter(Boolean)
    .join(", ");
}

// Sandbox until LALAMOVE_ENV=production is set — matches the sk_test/sk_live split
// already used for PayMongo, just via an explicit env var since Lalamove's sandbox and
// production environments live at entirely different base URLs (not just different keys).
function baseUrl(): string {
  return process.env.LALAMOVE_ENV === "production"
    ? "https://rest.lalamove.com/v3"
    : "https://rest.sandbox.lalamove.com/v3";
}

function credentials(): { key: string; secret: string } {
  const key = process.env.LALAMOVE_API_KEY;
  const secret = process.env.LALAMOVE_API_SECRET;
  if (!key || !secret) throw new Error("LALAMOVE_API_KEY and LALAMOVE_API_SECRET must be set");
  return { key, secret };
}

// SIGNATURE = HmacSHA256Hex(`${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`, secret)
// Authorization: hmac <key>:<timestamp>:<signature>
function authHeader(method: string, path: string, body: string): string {
  const { key, secret } = credentials();
  const timestamp = Date.now().toString();
  const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  return `hmac ${key}:${timestamp}:${signature}`;
}

async function lalamoveRequest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const bodyStr = body ? JSON.stringify(body) : "";
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Authorization: authHeader(method, path, bodyStr),
      Market: "PH",
      "Request-ID": randomUUID(),
      "Content-Type": "application/json",
    },
    body: bodyStr || undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Lalamove ${method} ${path} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json as T;
}

export type LalamoveQuotation = {
  quotationId: string;
  priceTotal: number; // PHP, whole pesos
  currency: string;
  expiresAt: string;
  senderStopId: string;
  recipientStopId: string;
};

// Business pickup point — where the camera actually ships from. Update if the owner's
// pickup location changes; there's no per-order "origin" input since it's always here.
const PICKUP_POINT = {
  lat: process.env.LALAMOVE_PICKUP_LAT ?? "14.5995",
  lng: process.env.LALAMOVE_PICKUP_LNG ?? "120.9842",
  address: process.env.LALAMOVE_PICKUP_ADDRESS ?? "Manila, Philippines",
};

const SENDER = {
  name: process.env.LALAMOVE_SENDER_NAME ?? "Digimarket_PH",
  phone: process.env.LALAMOVE_SENDER_PHONE ?? "",
};

// serviceType "MOTORCYCLE" is PH's smallest/cheapest tier — fine for a camera-sized
// parcel. Confirm this is still a valid PH service type via GET /v3/cities if Lalamove
// ever rejects it; their per-market service list can change.
export async function getQuotation(dropoff: LatLng & { address: string }): Promise<LalamoveQuotation> {
  type QuotationResponse = {
    data: {
      quotationId: string;
      priceBreakdown: { total: string; currency: string };
      expiresAt: string;
      stops: { stopId: string }[];
    };
  };
  const res = await lalamoveRequest<QuotationResponse>("POST", "/quotations", {
    data: {
      serviceType: "MOTORCYCLE",
      language: "en_PH",
      stops: [
        { coordinates: { lat: PICKUP_POINT.lat, lng: PICKUP_POINT.lng }, address: PICKUP_POINT.address },
        { coordinates: { lat: String(dropoff.lat), lng: String(dropoff.lng) }, address: dropoff.address },
      ],
    },
  });
  return {
    quotationId: res.data.quotationId,
    priceTotal: Math.round(Number(res.data.priceBreakdown.total)),
    currency: res.data.priceBreakdown.currency,
    expiresAt: res.data.expiresAt,
    senderStopId: res.data.stops[0].stopId,
    recipientStopId: res.data.stops[1].stopId,
  };
}

export type LalamovePlacedOrder = {
  orderId: string;
  shareLink: string | null;
  status: string;
};

export async function placeOrder(params: {
  quotation: LalamoveQuotation;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  orderId: string; // our own order id, passed through as metadata for the webhook to match back
}): Promise<LalamovePlacedOrder> {
  type OrderResponse = { data: { orderId: string; shareLink?: string; status: string } };
  const res = await lalamoveRequest<OrderResponse>("POST", "/orders", {
    data: {
      quotationId: params.quotation.quotationId,
      sender: { stopId: params.quotation.senderStopId, name: params.senderName, phone: params.senderPhone },
      recipients: [
        { stopId: params.quotation.recipientStopId, name: params.recipientName, phone: params.recipientPhone },
      ],
      metadata: { order_id: params.orderId },
    },
  });
  return { orderId: res.data.orderId, shareLink: res.data.shareLink ?? null, status: res.data.status };
}

// Single entrypoint for the post-payment booking step: always re-quotes right before
// booking, since any quotation shown earlier (the live checkout preview, or the one
// fetched at order-creation time) is long expired by the time a payment webhook lands.
export async function bookLalamoveDelivery(params: {
  orderId: string;
  dropoff: LatLng & { address: string };
  recipientName: string;
  recipientPhone: string;
}): Promise<LalamovePlacedOrder> {
  const quotation = await getQuotation(params.dropoff);
  return placeOrder({
    quotation,
    senderName: SENDER.name,
    senderPhone: SENDER.phone,
    recipientName: params.recipientName,
    recipientPhone: params.recipientPhone,
    orderId: params.orderId,
  });
}

// Same HMAC-SHA256 mechanism the REST API itself uses, per Lalamove's docs — but the
// exact webhook header name/format is unconfirmed against a real delivery, same caveat
// as PayMongo's payment_method_used field: verify once real webhooks are flowing and
// adjust if Lalamove's dashboard shows a different header.
export function verifyLalamoveWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const { secret } = credentials();
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const candidateBuf = Buffer.from(signatureHeader, "hex");
  return candidateBuf.length === expectedBuf.length && timingSafeEqual(expectedBuf, candidateBuf);
}
