import type { CheckoutRequestBody } from "../../server/types";
import type { CatalogItem } from "./data";

export type ProductsResponse = {
  camcorders: CatalogItem[];
  digicams: CatalogItem[];
  kits: { id: string; price: number }[];
};

export async function fetchProducts(): Promise<ProductsResponse> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
  try {
    return (await res.json()) as ProductsResponse;
  } catch {
    // Most commonly: no backend attached to this deployment (e.g. plain `vite dev`
    // instead of `vercel dev` — see /api/products), so the dev server's HTML
    // fallback answered instead of a real API response.
    throw new Error("Failed to load products — the API didn't return valid data.");
  }
}

export type CheckoutResult = { orderId: string; redirect: string | null };

export class CheckoutUnavailableError extends Error {
  unavailableItems: string[];
  constructor(unavailableItems: string[]) {
    super("Some items in your bag are no longer available.");
    this.name = "CheckoutUnavailableError";
    this.unavailableItems = unavailableItems;
  }
}

export async function createCheckout(body: CheckoutRequestBody): Promise<CheckoutResult> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; unavailableItems?: string[] } & Partial<CheckoutResult>;

  if (res.status === 409 && json.error === "unavailable") {
    throw new CheckoutUnavailableError(json.unavailableItems ?? []);
  }
  if (!res.ok || !json.orderId) {
    throw new Error(json.error ?? "Checkout failed — please try again.");
  }
  return { orderId: json.orderId, redirect: json.redirect ?? null };
}

export type LalamoveQuoteResult = { feePhp: number; expiresAt: string };

export async function fetchLalamoveQuote(dropoffPin: { lat: number; lng: number }, address: string): Promise<LalamoveQuoteResult> {
  const res = await fetch("/api/checkout/lalamove-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dropoffPin, address }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & Partial<LalamoveQuoteResult>;
  if (!res.ok || json.feePhp === undefined) {
    throw new Error(json.error ?? "Couldn't get a Lalamove quote — please try again.");
  }
  return { feePhp: json.feePhp, expiresAt: json.expiresAt ?? "" };
}

export type OrderStatusResult = {
  status: "pending_payment" | "paid" | "cod_pending" | "fulfilled" | "cancelled" | "expired";
  fulfillmentMethod: "online" | "cod";
  totalPhp: number;
};

export async function fetchOrderStatus(orderId: string): Promise<OrderStatusResult> {
  const res = await fetch(`/api/order-status?orderId=${encodeURIComponent(orderId)}`);
  if (!res.ok) throw new Error(`Failed to load order status (${res.status})`);
  try {
    return (await res.json()) as OrderStatusResult;
  } catch {
    throw new Error("Failed to load order status — the API didn't return valid data.");
  }
}
