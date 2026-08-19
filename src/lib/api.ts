import type { CheckoutRequestBody, PaymentPlan, ShippingMethod } from "../../server/types";
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

export async function uploadPaymentProof(file: File): Promise<{ path: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/checkout/upload-proof", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { error?: string; path?: string };
  if (!res.ok || !json.path) {
    throw new Error(json.error ?? "Couldn't upload your proof of payment — please try again.");
  }
  return { path: json.path };
}

export type PaymentQrCode = { label: string; imageUrl: string };

export async function fetchPaymentQrCodes(): Promise<PaymentQrCode[]> {
  const res = await fetch("/api/payment-qr");
  if (!res.ok) return [];
  try {
    const json = (await res.json()) as { codes?: PaymentQrCode[] };
    return json.codes ?? [];
  } catch {
    return [];
  }
}

export type OrderStatusResult = {
  status: "pending_payment" | "pending_verification" | "paid" | "cod_pending" | "fulfilled" | "cancelled" | "expired";
  fulfillmentMethod: "online" | "cod";
  shippingMethod: ShippingMethod;
  totalPhp: number;
  paymentPlan: PaymentPlan;
  layawayBalancePhp: number | null;
  layawayBalanceDueAt: string | null;
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

export type PayBalanceStatus = {
  customerName: string;
  items: { name: string; quantity: number }[];
  downPaymentCleared: boolean;
  balancePhp: number | null;
  balanceDueAt: string | null;
};

export async function fetchPayBalanceStatus(orderId: string): Promise<PayBalanceStatus> {
  const res = await fetch(`/api/pay-balance-status?orderId=${encodeURIComponent(orderId)}`);
  const json = (await res.json().catch(() => ({}))) as { error?: string } & Partial<PayBalanceStatus>;
  if (!res.ok || json.balancePhp === undefined) {
    throw new Error(json.error ?? "Couldn't load this order — please try again.");
  }
  return {
    customerName: json.customerName ?? "",
    items: json.items ?? [],
    downPaymentCleared: json.downPaymentCleared ?? false,
    balancePhp: json.balancePhp ?? null,
    balanceDueAt: json.balanceDueAt ?? null,
  };
}

export async function subscribe(email: string, nativeLanguage?: string): Promise<void> {
  const res = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, nativeLanguage }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Couldn't join the list — please try again.");
}

export async function unsubscribe(email: string): Promise<void> {
  const res = await fetch("/api/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Couldn't unsubscribe — please try again.");
}

export async function submitPayBalanceProof(orderId: string, proofOfPaymentUrl: string): Promise<void> {
  const res = await fetch("/api/checkout/pay-balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, proofOfPaymentUrl }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "Couldn't submit your proof of payment — please try again.");
  }
}
