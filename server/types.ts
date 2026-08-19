export type UnitCategory = "digicam" | "camcorder";
export type UnitStatus = "available" | "reserved" | "sold";

export type UnitRow = {
  id: string;
  category: UnitCategory;
  brand: string | null;
  name: string;
  price_php: number;
  old_price_php: number | null;
  badge: string | null;
  best_for: string | null;
  description: string | null;
  is_featured: boolean;
  image_url: string | null;
  image_back_url: string | null;
  sample_photo_urls: string[] | null;
  tint: string | null;
  status: UnitStatus;
  reservation_expires_at: string | null;
  reserved_order_id: string | null;
};

export type KitRow = {
  id: string;
  name: string;
  price_php: number;
  is_active: boolean;
};

export type OrderStatusValue =
  | "pending_payment" // legacy PayMongo status — no longer produced by new orders
  | "pending_verification" // customer uploaded proof of payment, owner hasn't confirmed it yet
  | "paid"
  | "cod_pending"
  | "fulfilled"
  | "cancelled"
  | "expired";

export type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
};

export type CheckoutItemInput = {
  type: "unit" | "kit";
  id: string;
  quantity?: number;
};

// "meetup"/"pickup" are in-person exchanges (no courier at all) — always cash or fund
// transfer at the exchange, never paid through PayMongo. "dhl" checkout does offer, but
// its own real shipping cost is still quoted manually since there's no live rate API yet.
export type ShippingMethod = "lbc" | "lalamove" | "dhl" | "meetup" | "pickup";

export type LatLng = { lat: number; lng: number };

// "layaway" always requires fulfillmentMethod "online" — the down payment (30% of a
// 5%-fee-inclusive total, see api/checkout.ts's computeLayawaySplit) is paid now via QR +
// proof of payment, the remaining balance is owed within 30 days and collected the same
// way through a second proof submission (api/checkout/pay-balance.ts).
export type PaymentPlan = "full" | "layaway";

export type CheckoutRequestBody = {
  items: CheckoutItemInput[];
  customer: { name: string; email: string; phone: string };
  shipping: ShippingAddress;
  fulfillmentMethod: "online" | "cod";
  shippingMethod?: ShippingMethod; // defaults to "lbc" server-side when omitted
  dropoffPin?: LatLng; // required when shippingMethod === "lalamove"
  paymentPlan?: PaymentPlan; // defaults to "full" server-side when omitted
  // English name of the language the customer picked on their first visit (see
  // src/lib/languages.ts) — informational only, so the owner knows what language to reply
  // in. Absent when they skipped the prompt or cleared their browser storage.
  nativeLanguage?: string;
  // Storage path returned by POST /api/checkout/upload-proof — required whenever
  // fulfillmentMethod is "online", since payment is now a manual QR + proof flow instead
  // of a PayMongo redirect (see server/paymentProofs.ts).
  proofOfPaymentUrl?: string;
};

export type OrderRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  fulfillment_method: "online" | "cod";
  shipping_method: ShippingMethod;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  payment_method: string | null;
  status: OrderStatusValue;
  subtotal_php: number;
  shipping_fee_php: number;
  total_php: number;
  paymongo_checkout_session_id: string | null;
  paymongo_payment_intent_id: string | null;
  lalamove_order_id: string | null;
  lalamove_share_link: string | null;
  lalamove_status: string | null;
  payment_plan: PaymentPlan;
  layaway_balance_php: number | null;
  layaway_balance_due_at: string | null;
  native_language: string | null;
  proof_of_payment_url: string | null;
  layaway_balance_proof_url: string | null;
  notes: string | null;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  item_type: "unit" | "kit";
  unit_id: string | null;
  kit_id: string | null;
  name_snapshot: string;
  price_php_snapshot: number;
  quantity: number;
};
