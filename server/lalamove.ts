import { randomUUID, createHmac } from "node:crypto";
import type { LatLng } from "./types.js";

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

// Informational only — the checkout flow never books through this API or charges this
// fee. The owner always books the actual Lalamove delivery manually on their phone once
// they've settled the fee with the customer via DM; this quote just gives the customer a
// live estimate to plan around. serviceType "MOTORCYCLE" is PH's smallest/cheapest tier —
// fine for a camera-sized parcel.
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