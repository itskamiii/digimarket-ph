import { getSupabase } from "./supabase.js";
import type { KitRow, OrderItemRow, OrderRow, OrderStatusValue, ShippingAddress, UnitRow } from "./types.js";

export async function getProducts(): Promise<{ units: UnitRow[]; kits: KitRow[] }> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  const [unitsRes, kitsRes] = await Promise.all([
    supabase.from("units").select("*").order("name"),
    supabase.from("kits").select("*").eq("is_active", true).order("price_php"),
  ]);
  if (unitsRes.error) throw unitsRes.error;
  if (kitsRes.error) throw kitsRes.error;

  // Show an expired-but-not-yet-swept reservation as available — the pg_cron sweep
  // catches up within a minute, but the public listing shouldn't lag behind reality.
  const units = (unitsRes.data as UnitRow[]).map((unit) => {
    const expired =
      unit.status === "reserved" && !!unit.reservation_expires_at && unit.reservation_expires_at < nowIso;
    return expired ? { ...unit, status: "available" as const } : unit;
  });

  return { units, kits: kitsRes.data as KitRow[] };
}

export async function getUnitsByIds(ids: string[]): Promise<UnitRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabase().from("units").select("*").in("id", ids);
  if (error) throw error;
  return data as UnitRow[];
}

export async function getKitsByIds(ids: string[]): Promise<KitRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabase().from("kits").select("*").in("id", ids).eq("is_active", true);
  if (error) throw error;
  return data as KitRow[];
}

export async function reserveUnits(
  unitIds: string[],
  orderId: string,
  options: { indefinite?: boolean } = {}
): Promise<{ reservedIds: string[]; missingIds: string[] }> {
  if (unitIds.length === 0) return { reservedIds: [], missingIds: [] };

  // COD orders are already a committed sale (payment happens on delivery, not via a
  // gateway we get a confirmation webhook from), so they hold the unit indefinitely
  // rather than on the same abandonment-timeout clock as an unpaid online checkout.
  const ttlMinutes = options.indefinite ? null : Number(process.env.RESERVATION_TTL_MINUTES ?? 15);
  const { data, error } = await getSupabase().rpc("reserve_units", {
    unit_ids: unitIds,
    p_order_id: orderId,
    ttl_minutes: ttlMinutes,
  });
  if (error) throw error;

  const reservedIds = (data as { id: string }[]).map((row) => row.id);
  const missingIds = unitIds.filter((id) => !reservedIds.includes(id));
  return { reservedIds, missingIds };
}

// Frees any units a since-abandoned checkout attempt reserved, so they're immediately
// buyable again instead of waiting out the reservation TTL. Used when rolling back an
// order that didn't make it all the way through (e.g. PayMongo call failed).
export async function releaseUnitsForOrder(orderId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("units")
    .update({ status: "available", reservation_expires_at: null, reserved_order_id: null })
    .eq("reserved_order_id", orderId)
    .eq("status", "reserved");
  if (error) throw error;
}

export async function markUnitsSold(orderId: string): Promise<void> {
  const { error } = await getSupabase().rpc("mark_units_sold", { p_order_id: orderId });
  if (error) throw error;
}

export type NewOrderInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  fulfillmentMethod: "online" | "cod";
  subtotalPhp: number;
  status: OrderStatusValue;
};

export async function insertOrder(order: NewOrderInput): Promise<OrderRow> {
  const { data, error } = await getSupabase()
    .from("orders")
    .insert({
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      customer_phone: order.customerPhone,
      shipping_address: order.shippingAddress,
      fulfillment_method: order.fulfillmentMethod,
      subtotal_php: order.subtotalPhp,
      shipping_fee_php: 0,
      total_php: order.subtotalPhp,
      status: order.status,
    })
    .select()
    .single();
  if (error) throw error;
  return data as OrderRow;
}

export type NewOrderItemInput = {
  itemType: "unit" | "kit";
  unitId?: string;
  kitId?: string;
  name: string;
  price: number;
  quantity: number;
};

export async function insertOrderItems(orderId: string, items: NewOrderItemInput[]): Promise<void> {
  const { error } = await getSupabase()
    .from("order_items")
    .insert(
      items.map((item) => ({
        order_id: orderId,
        item_type: item.itemType,
        unit_id: item.unitId ?? null,
        kit_id: item.kitId ?? null,
        name_snapshot: item.name,
        price_php_snapshot: item.price,
        quantity: item.quantity,
      }))
    );
  if (error) throw error;
}

export async function getOrderItemsByOrderId(orderId: string): Promise<OrderItemRow[]> {
  const { data, error } = await getSupabase().from("order_items").select("*").eq("order_id", orderId);
  if (error) throw error;
  return data as OrderItemRow[];
}

// Rolls back an order that failed to fully reserve its units (cascades to order_items).
export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await getSupabase().from("orders").delete().eq("id", orderId);
  if (error) throw error;
}

export async function attachPaymongoSession(
  orderId: string,
  sessionId: string,
  paymentIntentId: string | null
): Promise<void> {
  const { error } = await getSupabase()
    .from("orders")
    .update({ paymongo_checkout_session_id: sessionId, paymongo_payment_intent_id: paymentIntentId })
    .eq("id", orderId);
  if (error) throw error;
}

export async function getOrderById(orderId: string): Promise<OrderRow | null> {
  const { data, error } = await getSupabase().from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  return data as OrderRow | null;
}

export async function getOrderByCheckoutSessionId(sessionId: string): Promise<OrderRow | null> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("*")
    .eq("paymongo_checkout_session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as OrderRow | null;
}

// Used when a customer explicitly cancels out of PayMongo's checkout page — guarded so
// a race with the webhook can never downgrade an order that's actually already paid.
export async function markOrderCancelled(orderId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .neq("status", "paid");
  if (error) throw error;
}

// Idempotent — returns false if the order was already 'paid' (safe on webhook replay).
export async function markOrderPaid(orderId: string, paymentMethod: string | null): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("orders")
    .update({ status: "paid", payment_method: paymentMethod })
    .eq("id", orderId)
    .neq("status", "paid")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
