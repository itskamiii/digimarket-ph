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
  | "pending_payment"
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

// "layaway" always requires fulfillmentMethod "online" — the 30% down payment + 5%
// reservation fee is charged now, the remaining 65% is owed within 30 days and always
// collected manually (no recurring-charge mechanism in PayMongo Checkout Sessions).
export type PaymentPlan = "full" | "layaway";

export type CheckoutRequestBody = {
  items: CheckoutItemInput[];
  customer: { name: string; email: string; phone: string };
  shipping: ShippingAddress;
  fulfillmentMethod: "online" | "cod";
  shippingMethod?: ShippingMethod; // defaults to "lbc" server-side when omitted
  dropoffPin?: LatLng; // required when shippingMethod === "lalamove"
  paymentPlan?: PaymentPlan; // defaults to "full" server-side when omitted
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
