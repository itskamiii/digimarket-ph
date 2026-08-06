import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, ShoppingBag, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useCart } from "../context/CartContext";
import { CheckoutUnavailableError, createCheckout } from "../lib/api";
import { formatPeso } from "../lib/format";
import { EASE } from "./Reveal";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_customer: "Please fill in your name, email, and phone number.",
  invalid_shipping: "Please fill in a complete shipping address.",
  invalid_fulfillment_method: "Please choose how you'd like to pay.",
  cod_requires_metro_manila:
    "Cash on Delivery is only available within Metro Manila — choose online payment, or update your city.",
  empty_cart: "Your bag is empty.",
};
function friendlyError(message: string): string {
  return ERROR_MESSAGES[message] ?? "Something went wrong on our end — please try again.";
}

export default function Checkout({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, subtotal, pruneItems, clear } = useCart();
  const hasKit = useMemo(() => items.some((i) => i.type === "kit"), [items]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"online" | "cod">("online");
  const [installmentPlan, setInstallmentPlan] = useState<"full" | "3x">("full");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codConfirmedOrderId, setCodConfirmedOrderId] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await createCheckout({
        items: items.map((i) => ({ type: i.type, id: i.id, quantity: i.quantity })),
        customer: { name, email, phone },
        shipping: { line1, line2: line2 || undefined, city, province, postalCode },
        fulfillmentMethod,
        installmentPlan: hasKit ? installmentPlan : "full",
      });

      if (result.redirect) {
        window.location.href = result.redirect;
        return; // leaving the page
      }
      // COD — no redirect, order is confirmed as cod_pending immediately.
      clear();
      setCodConfirmedOrderId(result.orderId);
    } catch (err) {
      if (err instanceof CheckoutUnavailableError) {
        pruneItems(err.unavailableItems);
        setError("One or more items in your bag just sold out and were removed. Please review your bag and try again.");
      } else {
        setError(friendlyError(err instanceof Error ? err.message : "unknown"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCodConfirmedOrderId(null);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="checkout-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
            aria-hidden="true"
            className="fixed inset-0 z-[90] bg-ink-950/60 backdrop-blur-sm"
          />
          <motion.div
            key="checkout-panel"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Checkout"
            className="fixed inset-x-4 top-1/2 z-[95] mx-auto max-h-[88vh] max-w-lg -translate-y-1/2 overflow-y-auto rounded-[2rem] bg-cream-50 shadow-2xl shadow-ink-900/40 sm:inset-x-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-900/8 bg-cream-50/95 px-6 py-5 backdrop-blur">
              <h2 className="font-display text-lg font-bold text-ink-900">Checkout</h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close checkout"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-900/8 hover:text-ink-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {codConfirmedOrderId ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lcd-500/15 text-lcd-500">
                  <ShoppingBag className="h-6 w-6" />
                </span>
                <p className="font-display text-xl font-bold text-ink-900">Order confirmed!</p>
                <p className="max-w-xs text-sm text-ink-500">
                  We've reserved your unit(s). Pay the courier on delivery. We'll DM/email you shipping details
                  shortly.
                </p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                  Order #{codConfirmedOrderId.slice(0, 8)}
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-4 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-cream-50"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-5 px-6 py-6">
                {items.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-500">Your bag is empty.</p>
                ) : (
                  <>
                    <div className="rounded-2xl border border-ink-900/8 bg-cream-100/60 p-4">
                      <ul className="space-y-2">
                        {items.map((item) => (
                          <li key={item.key} className="flex items-center justify-between text-sm">
                            <span className="text-ink-700">
                              {item.quantity > 1 ? `${item.quantity}× ` : ""}
                              {item.name}
                            </span>
                            <span className="font-semibold text-ink-900">
                              {formatPeso(item.price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between border-t border-ink-900/8 pt-3">
                        <span className="text-sm font-semibold text-ink-900">Subtotal</span>
                        <span className="font-display text-lg font-bold text-ink-900">{formatPeso(subtotal)}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Full name" value={name} onChange={setName} autoComplete="name" required />
                      <Field label="Phone" value={phone} onChange={setPhone} type="tel" autoComplete="tel" required />
                    </div>
                    <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" required />
                    <Field label="Address line 1" value={line1} onChange={setLine1} autoComplete="address-line1" required />
                    <Field label="Address line 2 (optional)" value={line2} onChange={setLine2} autoComplete="address-line2" />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="City" value={city} onChange={setCity} autoComplete="address-level2" required />
                      <Field label="Province" value={province} onChange={setProvince} autoComplete="address-level1" required />
                      <Field label="Postal code" value={postalCode} onChange={setPostalCode} autoComplete="postal-code" required />
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                        How would you like to pay?
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <RadioCard
                          label="Pay online now"
                          hint="GCash, Maya, or card"
                          checked={fulfillmentMethod === "online"}
                          onSelect={() => setFulfillmentMethod("online")}
                        />
                        <RadioCard
                          label="Cash on Delivery"
                          hint="Metro Manila only"
                          checked={fulfillmentMethod === "cod"}
                          onSelect={() => setFulfillmentMethod("cod")}
                        />
                      </div>
                    </div>

                    {hasKit && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                          Kit payment schedule
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <RadioCard
                            label="Pay in full"
                            checked={installmentPlan === "full"}
                            onSelect={() => setInstallmentPlan("full")}
                          />
                          <RadioCard
                            label="3x 0% interest"
                            hint="Arranged manually with us after checkout"
                            checked={installmentPlan === "3x"}
                            onSelect={() => setInstallmentPlan("3x")}
                          />
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="flex items-start gap-2 rounded-2xl bg-flash-500/10 px-4 py-3 text-sm text-flash-600">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-shine flex items-center justify-center gap-2 rounded-full bg-flash-500 px-6 py-4 text-sm font-semibold text-cream-50 shadow-xl shadow-flash-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:bg-flash-600 disabled:pointer-events-none disabled:opacity-60"
                    >
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {fulfillmentMethod === "cod" ? "Place order" : "Continue to payment"}
                    </button>
                  </>
                )}
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="rounded-xl border border-ink-900/10 bg-cream-50 px-4 py-2.5 text-sm text-ink-900 transition-colors focus:border-flash-500/60 focus:outline-none"
      />
    </label>
  );
}

function RadioCard({
  label,
  hint,
  checked,
  onSelect,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={`rounded-2xl border px-4 py-3 text-left transition-colors duration-300 ${
        checked ? "border-flash-500 bg-flash-500/8" : "border-ink-900/10 hover:border-ink-900/25"
      }`}
    >
      <p className="text-sm font-semibold text-ink-900">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </button>
  );
}
