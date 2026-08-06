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

export type CheckoutRequestBody = {
  items: CheckoutItemInput[];
  customer: { name: string; email: string; phone: string };
  shipping: ShippingAddress;
  fulfillmentMethod: "online" | "cod";
};

export type OrderRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  fulfillment_method: "online" | "cod";
  payment_method: string | null;
  status: OrderStatusValue;
  subtotal_php: number;
  shipping_fee_php: number;
  total_php: number;
  paymongo_checkout_session_id: string | null;
  paymongo_payment_intent_id: string | null;
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
