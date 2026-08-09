import type { ShippingAddress } from "./types.js";

const peso = (n: number) => "₱" + n.toLocaleString("en-PH");

// Reuses the same Formspree form as the waitlist signup — it's already wired to the
// owner's inbox. Never throws: a notification hiccup must never block a real order.
export async function notifyNewOrder(params: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  fulfillmentMethod: "online" | "cod";
  items: { name: string; price: number; quantity: number }[];
  totalPhp: number;
}): Promise<void> {
  const endpoint = process.env.VITE_FORMSPREE_ENDPOINT;
  if (!endpoint) {
    console.error("VITE_FORMSPREE_ENDPOINT is not set — new-order notification skipped");
    return;
  }

  const addr = params.shippingAddress;
  const shippingLine = [addr.line1, addr.line2, addr.city, addr.province, addr.postalCode]
    .filter(Boolean)
    .join(", ");
  const itemsLine = params.items.map((i) => `${i.quantity}x ${i.name} (${peso(i.price)})`).join("; ");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        _subject: `New ${params.fulfillmentMethod === "cod" ? "COD" : "paid online"} order — ${peso(params.totalPhp)}`,
        _replyto: params.customerEmail,
        orderId: params.orderId,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        shippingAddress: shippingLine,
        fulfillmentMethod: params.fulfillmentMethod,
        items: itemsLine,
        total: peso(params.totalPhp),
      }),
    });
    if (!res.ok) {
      console.error("New-order notification failed", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("New-order notification failed", err);
  }
}
