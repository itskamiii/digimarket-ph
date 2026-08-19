import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, ShoppingBag, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCart } from "../context/CartContext";
import {
  CheckoutUnavailableError,
  createCheckout,
  fetchLalamoveQuote,
  fetchPaymentQrCodes,
  uploadPaymentProof,
  type PaymentQrCode,
} from "../lib/api";
import { formatPeso } from "../lib/format";
import { getNativeLanguage } from "../lib/languages";
import phAddresses from "../lib/ph-addresses.json";
import LalamovePinPicker from "./LalamovePinPicker";
import { EASE } from "./Reveal";

type PhAddress = { province: string; city: string; zip: string };
const PH_ADDRESSES = phAddresses as PhAddress[];
const PROVINCES = [...new Set(PH_ADDRESSES.map((a) => a.province))].sort();

const ERROR_MESSAGES: Record<string, string> = {
  invalid_customer: "Please fill in your name, email, and phone number.",
  invalid_shipping: "Please fill in a complete shipping address.",
  invalid_fulfillment_method: "Please choose how you'd like to pay.",
  invalid_shipping_method: "Please choose a shipping option.",
  lalamove_ncr_only: "Lalamove is only available within Metro Manila — choose LBC or DHL for other provinces.",
  invalid_dropoff_pin: "Please drop a pin at your exact delivery location.",
  lalamove_unavailable: "Couldn't reach Lalamove for a delivery quote — please try again, or choose LBC.",
  in_person_requires_manual_payment: "Meet up and Pick up are always settled in person — please try again.",
  invalid_payment_plan: "Please choose Full or Layaway.",
  layaway_requires_online_payment: "Layaway's down payment is always paid online — please try again.",
  missing_proof_of_payment: "Please upload your proof of payment.",
  empty_cart: "Your bag is empty.",
  rate_limited: "Too many checkout attempts — please wait a few minutes and try again.",
};
function friendlyError(message: string): string {
  return ERROR_MESSAGES[message] ?? "Something went wrong on our end — please try again.";
}

type ShippingMethod = "lbc" | "lalamove" | "dhl" | "meetup" | "pickup";
const SHIPPING_METHODS = ["lbc", "lalamove", "dhl", "meetup", "pickup"] as const;
// Meet up / Pick up are in-person exchanges, not couriers — there's no "pay online now"
// alternative for them at all, so the payment-method section is hidden entirely and
// fulfillmentMethod is forced to "cod" the moment one is selected (see the effect below).
const IN_PERSON_METHODS = new Set<ShippingMethod>(["meetup", "pickup"]);

// The COD-style second payment option is courier-specific in both label and mechanics:
// all three couriers skip PayMongo and become a committed order the moment it's
// submitted (same indefinite-hold behavior). LBC's actual shipping fee (weight/distance-
// dependent, no live rate available) is never computed by the site either way — always
// relayed via DM, collected as COD on delivery.
function secondPaymentOption(shippingMethod: ShippingMethod): { label: string; hint: string } {
  if (shippingMethod === "lalamove") {
    return { label: "Fund transfer upon delivery", hint: "GCash/bank transfer — final SF via DM" };
  }
  if (shippingMethod === "dhl") {
    return { label: "Other payment options", hint: "Coordinate via chat/DM" };
  }
  return { label: "Cash on Delivery", hint: "Final SF via DM" };
}

const COURIER_LABELS: Record<ShippingMethod, string> = {
  lbc: "LBC",
  lalamove: "Lalamove",
  dhl: "DHL",
  meetup: "Meet up",
  pickup: "Pick up",
};

const COURIER_HINTS: Record<ShippingMethod, string> = {
  lbc: "Nationwide, 1–7 days",
  lalamove: "Same-day, NCR only",
  dhl: "Outside the Philippines",
  meetup: "₱250 in Rizal, ₱300 elsewhere",
  pickup: "No fee — at our location",
};

type PaymentPlan = "full" | "layaway";

// Mirrors api/checkout.ts's computeLayawaySplit exactly — a 5% reservation fee is added
// on top of the subtotal to get the New Total, then the down payment due today is 30%
// of that fee-inclusive New Total (not 30% of the plain subtotal). Done in integer
// centavos so downPayment + balance always reconciles to exactly the New Total.
function computeLayawaySplit(subtotalPhp: number) {
  const subtotalCentavos = Math.round(subtotalPhp * 100);
  const feeCentavos = Math.round(subtotalCentavos * 0.05);
  const newTotalCentavos = subtotalCentavos + feeCentavos;
  const downPaymentCentavos = Math.round(newTotalCentavos * 0.3);
  return {
    reservationFeePhp: feeCentavos / 100,
    newTotalPhp: newTotalCentavos / 100,
    downPaymentPhp: downPaymentCentavos / 100,
    balancePhp: (newTotalCentavos - downPaymentCentavos) / 100,
  };
}

const COD_CONFIRMATION_TEXT: Record<ShippingMethod, string> = {
  lbc: "We've reserved your unit(s). Pay the courier on delivery. We'll DM/email you shipping details shortly.",
  lalamove:
    "We've reserved your unit(s). We'll settle everything via DM on Instagram — confirming your fund transfer, booking your Lalamove rider, and sending you the delivery details.",
  dhl: "We've reserved your unit(s). We'll settle everything via DM on Instagram — confirming payment and quoting your DHL shipping rate.",
  meetup:
    "We've reserved your unit(s). We'll DM you on Instagram to set the meet-up time and place — cash or fund transfer plus the meet-up fee on the day.",
  pickup:
    "We've reserved your unit(s). We'll DM you on Instagram to arrange a pickup time — cash or fund transfer on the day, no extra fee.",
};

// Online payment no longer redirects anywhere to confirm — the proof of payment is
// already attached, so every courier gets the same "we're checking it" message here,
// same shape as COD's per-courier text but without repeating the courier-specific
// fulfillment details (those still go out over DM once the payment's actually verified).
function confirmationText(shippingMethod: ShippingMethod, fulfillmentMethod: "online" | "cod"): string {
  if (fulfillmentMethod === "online") {
    return "We've reserved your unit(s) and received your proof of payment. We're verifying it now and will confirm shortly — we'll DM or email you once it's set.";
  }
  return COD_CONFIRMATION_TEXT[shippingMethod];
}

export default function Checkout({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, subtotal, pruneItems, clear } = useCart();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"online" | "cod">("online");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("lbc");
  const [qrCodes, setQrCodes] = useState<PaymentQrCode[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [dropoffPin, setDropoffPin] = useState<{ lat: number; lng: number } | null>(null);
  const [lalamoveFeePhp, setLalamoveFeePhp] = useState<number | null>(null);
  const [lalamoveQuoteLoading, setLalamoveQuoteLoading] = useState(false);
  const [lalamoveQuoteError, setLalamoveQuoteError] = useState<string | null>(null);
  // null = the "Full or Layaway?" step hasn't been answered yet; gates the rest of the
  // form (see the render branches below).
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan | null>(null);

  const layawaySplit = computeLayawaySplit(subtotal);

  // Courier is chosen before the address, so eligibility can only be checked once the
  // customer has typed a province — surfaced as an inline warning (below) rather than
  // silently switching their chosen courier out from under them.
  const isMetroManila = province === "Metro Manila";
  const lalamoveIneligible = shippingMethod === "lalamove" && province !== "" && !isMetroManila;

  // Layaway's down payment always needs proof of payment now, taking precedence over Meet
  // up/Pick up's usual "force cod" rule (see the effect's normal case below) — the
  // down payment is a separate, unrelated charge from however the item eventually gets
  // physically handed over.
  useEffect(() => {
    if (paymentPlan === "layaway") {
      if (fulfillmentMethod !== "online") setFulfillmentMethod("online");
      return;
    }
    if (IN_PERSON_METHODS.has(shippingMethod) && fulfillmentMethod !== "cod") {
      setFulfillmentMethod("cod");
    }
  }, [shippingMethod, fulfillmentMethod, paymentPlan]);

  // Fetched once when checkout opens rather than at module load — no point hitting the
  // API for someone who never opens their bag. Self-adapting to whatever the owner has
  // uploaded to the payment-qr/ storage folder (see api/payment-qr.ts) — an empty list
  // just means the "how would you like to pay" section below shows a fallback instead.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchPaymentQrCodes().then((codes) => {
      if (!cancelled) setQrCodes(codes);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Flat meet-up fee, cheaper within Rizal (where the business is based, in Cainta) than
  // further out — no fee at all for pickup.
  const meetupFeePhp = shippingMethod === "meetup" ? (province === "Rizal" ? 250 : 300) : 0;
  // Neither LBC's nor Lalamove's real shipping/delivery fee is ever charged through the
  // site — always settled via DM (LBC: collected as COD or relayed via DM; Lalamove:
  // booked manually on the owner's phone regardless of payment path). Only Meet up
  // contributes a real, known-upfront fee.
  const shippingFeePhp = shippingMethod === "meetup" ? meetupFeePhp : 0;
  // What the QR payment actually needs to cover right now — the full subtotal (+ any
  // upfront courier fee) for a full payment, or just the down payment + reservation fee
  // (+ upfront courier fee) for layaway. The layaway balance is never part of this.
  const dueTodayPhp = (paymentPlan === "layaway" ? layawaySplit.downPaymentPhp : subtotal) + shippingFeePhp;

  // Fee depends only on the dropped pin, not the typed address text, so this only
  // re-fires when the pin actually moves — not on every keystroke elsewhere in the form.
  useEffect(() => {
    if (shippingMethod !== "lalamove" || !dropoffPin) {
      setLalamoveFeePhp(null);
      return;
    }
    let cancelled = false;
    setLalamoveQuoteLoading(true);
    setLalamoveQuoteError(null);
    const address = [line1, line2, city, province, postalCode].filter(Boolean).join(", ") || "Metro Manila, Philippines";
    fetchLalamoveQuote(dropoffPin, address)
      .then((quote) => {
        if (!cancelled) setLalamoveFeePhp(quote.feePhp);
      })
      .catch((err) => {
        if (!cancelled) setLalamoveQuoteError(err instanceof Error ? err.message : "Couldn't get a quote.");
      })
      .finally(() => {
        if (!cancelled) setLalamoveQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingMethod, dropoffPin]);

  // City options narrow to the chosen province once one's picked; searching city first
  // (before province) still works against the full list, and picking a city fills in
  // its province + a starting postal code — left editable since one dataset zip can't
  // always be exactly right down to the barangay (Metro Manila especially).
  const cityOptions = useMemo(
    () => (province ? PH_ADDRESSES.filter((a) => a.province === province) : PH_ADDRESSES).map((a) => a.city),
    [province]
  );

  const selectProvince = (nextProvince: string) => {
    setProvince(nextProvince);
    if (!PH_ADDRESSES.some((a) => a.province === nextProvince && a.city === city)) {
      setCity("");
    }
  };

  const selectCity = (nextCity: string) => {
    setCity(nextCity);
    const match = PH_ADDRESSES.find((a) => a.city === nextCity && (!province || a.province === province));
    if (match) {
      setProvince(match.province);
      setPostalCode(match.zip);
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || submitting) return;
    if (shippingMethod === "lalamove") {
      if (lalamoveIneligible) {
        setError("Lalamove is only available within Metro Manila — please choose LBC or DHL instead.");
        return;
      }
      if (!dropoffPin) {
        setError("Please drop a pin at your exact delivery location.");
        return;
      }
    }
    if (fulfillmentMethod === "online" && !proofFile) {
      setError("Please upload your proof of payment.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // Two-step for online: the file goes up first (its own endpoint, since
      // api/checkout.ts stays plain JSON), then the resulting storage path rides along
      // in the normal checkout submission.
      const proofOfPaymentUrl =
        fulfillmentMethod === "online" ? (await uploadPaymentProof(proofFile!)).path : undefined;

      const result = await createCheckout({
        items: items.map((i) => ({ type: i.type, id: i.id, quantity: i.quantity })),
        customer: { name, email, phone },
        shipping: { line1, line2: line2 || undefined, city, province, postalCode },
        fulfillmentMethod,
        shippingMethod,
        dropoffPin: shippingMethod === "lalamove" ? dropoffPin! : undefined,
        paymentPlan: paymentPlan ?? "full",
        // Picked on their first visit (LanguagePrompt.tsx) — rides along so the owner
        // knows what language to reply in. null when they skipped the prompt.
        nativeLanguage: getNativeLanguage() ?? undefined,
        proofOfPaymentUrl,
      });

      // Every order is a committed sale the instant it's submitted now — no redirect,
      // online or not (see api/checkout.ts).
      clear();
      setConfirmedOrderId(result.orderId);
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
    setConfirmedOrderId(null);
    setError(null);
    setPaymentPlan(null);
    setProofFile(null);
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

            {confirmedOrderId ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lcd-500/15 text-lcd-500">
                  <ShoppingBag className="h-6 w-6" />
                </span>
                <p className="font-display text-xl font-bold text-ink-900">Order confirmed!</p>
                <p className="max-w-xs text-sm text-ink-500">{confirmationText(shippingMethod, fulfillmentMethod)}</p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                  Order #{confirmedOrderId.slice(0, 8)}
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-4 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-cream-50"
                >
                  Done
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-500">Your bag is empty.</p>
            ) : paymentPlan === null ? (
              <div className="flex flex-col gap-4 px-6 py-8">
                <p className="text-center text-sm text-ink-500">How would you like to pay for this order?</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentPlan("full")}
                    className="flex flex-col items-start gap-1.5 rounded-3xl border border-ink-900/10 p-5 text-left transition-colors duration-300 hover:border-flash-500/50 hover:bg-flash-500/5"
                  >
                    <p className="font-display text-lg font-bold text-ink-900">Pay in Full</p>
                    <p className="text-xs text-ink-500">
                      Pay {formatPeso(subtotal)} — online, cash on delivery, or however each courier allows.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentPlan("layaway")}
                    className="flex flex-col items-start gap-1.5 rounded-3xl border border-ink-900/10 p-5 text-left transition-colors duration-300 hover:border-flash-500/50 hover:bg-flash-500/5"
                  >
                    <p className="font-display text-lg font-bold text-ink-900">Layaway</p>
                    <p className="text-xs text-ink-500">
                      Includes a 5% reservation fee. Reserve it for {formatPeso(layawaySplit.downPaymentPhp)} now
                      (30%), pay the {formatPeso(layawaySplit.balancePhp)} balance within 30 days.
                    </p>
                  </button>
                </div>
                <p className="text-center text-[11px] leading-relaxed text-ink-400">
                  Layaway is final — no refund if the 30-day window lapses, no cancellations, no switching units
                  once your down payment is in.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-5 px-6 py-6">
                <>
                    <button
                      type="button"
                      onClick={() => setPaymentPlan(null)}
                      className="-mb-1 self-start text-xs font-semibold text-ink-500 hover:text-ink-900"
                    >
                      ← Change payment plan
                    </button>
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
                        <span className="text-sm text-ink-500">Subtotal</span>
                        <span className="text-sm font-semibold text-ink-900">{formatPeso(subtotal)}</span>
                      </div>
                      {paymentPlan === "layaway" && (
                        <>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-sm text-ink-500">Reservation fee (5%)</span>
                            <span className="text-sm font-semibold text-ink-900">
                              {formatPeso(layawaySplit.reservationFeePhp)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-sm text-ink-500">New total</span>
                            <span className="text-sm font-semibold text-ink-900">
                              {formatPeso(layawaySplit.newTotalPhp)}
                            </span>
                          </div>
                        </>
                      )}
                      {shippingMethod === "lalamove" && (
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-sm text-ink-500">SF</span>
                          <span className="text-sm font-semibold text-ink-900">Via DM</span>
                        </div>
                      )}
                      {shippingMethod === "lbc" && (
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-sm text-ink-500">SF</span>
                          <span className="text-sm font-semibold text-ink-900">
                            {fulfillmentMethod === "cod" ? "Via DM" : "COD"}
                          </span>
                        </div>
                      )}
                      {shippingMethod === "meetup" && (
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-sm text-ink-500">Meet-up fee</span>
                          <span className="text-sm font-semibold text-ink-900">{formatPeso(meetupFeePhp)}</span>
                        </div>
                      )}
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink-900">
                          {paymentPlan === "layaway" ? "Due today" : "Total"}
                        </span>
                        <span className="font-display text-lg font-bold text-ink-900">{formatPeso(dueTodayPhp)}</span>
                      </div>
                      {paymentPlan === "layaway" && (
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-sm text-ink-500">Balance (due in 30 days)</span>
                          <span className="text-sm font-semibold text-ink-900">
                            {formatPeso(layawaySplit.balancePhp)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                        How would you like to receive it?
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {SHIPPING_METHODS.map((method) => (
                          <RadioCard
                            key={method}
                            label={COURIER_LABELS[method]}
                            hint={COURIER_HINTS[method]}
                            checked={shippingMethod === method}
                            onSelect={() => setShippingMethod(method)}
                          />
                        ))}
                      </div>
                    </div>

                    {paymentPlan === "layaway" ? (
                      <p className="text-xs text-ink-500">
                        Down payment paid online via QR (QRPh) now. Balance due within 30 days — we'll DM you a
                        payment breakdown.
                      </p>
                    ) : IN_PERSON_METHODS.has(shippingMethod) ? (
                      <p className="text-xs text-ink-500">
                        {shippingMethod === "meetup"
                          ? "Cash or fund transfer when we meet up, plus the meet-up fee shown above."
                          : "Cash or fund transfer when you pick it up — no extra fee."}
                      </p>
                    ) : (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                          How would you like to pay?
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <RadioCard
                            label="Pay online now"
                            hint="Via QR (QRPh)"
                            checked={fulfillmentMethod === "online"}
                            onSelect={() => setFulfillmentMethod("online")}
                          />
                          <RadioCard
                            label={secondPaymentOption(shippingMethod).label}
                            hint={secondPaymentOption(shippingMethod).hint}
                            checked={fulfillmentMethod === "cod"}
                            onSelect={() => setFulfillmentMethod("cod")}
                          />
                        </div>
                      </div>
                    )}

                    {fulfillmentMethod === "online" && (
                      <div className="rounded-2xl border border-ink-900/8 bg-cream-100/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                          Scan to pay {formatPeso(dueTodayPhp)}
                        </p>
                        {qrCodes.length > 0 ? (
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {qrCodes.map((qr) => (
                              <div key={qr.imageUrl} className="flex flex-col items-center gap-1.5">
                                <img
                                  src={qr.imageUrl}
                                  alt={`${qr.label} QR code`}
                                  className="aspect-square w-full rounded-xl border border-ink-900/8 bg-cream-50 object-contain p-1.5"
                                />
                                <span className="text-xs font-semibold text-ink-700">{qr.label}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-ink-500">
                            Our QR codes aren't loaded yet — message us on Instagram to arrange payment before
                            submitting this order.
                          </p>
                        )}

                        <label htmlFor="proof-of-payment" className="mt-4 block text-xs font-medium text-ink-500">
                          Proof of payment<RequiredMark />
                        </label>
                        <label
                          htmlFor="proof-of-payment"
                          className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-900/20 bg-cream-50 px-4 py-3 text-sm text-ink-500 transition-colors hover:border-flash-500/50"
                        >
                          <Upload className="h-4 w-4 shrink-0" />
                          <span className="truncate">{proofFile ? proofFile.name : "Upload a screenshot or receipt"}</span>
                        </label>
                        <input
                          id="proof-of-payment"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          required
                          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                          className="sr-only"
                        />
                      </div>
                    )}

                    {shippingMethod === "lalamove" && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-ink-500">
                          Drop a pin at your exact delivery location — tap the map, or drag the pin once it's placed.
                        </p>
                        <LalamovePinPicker value={dropoffPin} onChange={setDropoffPin} />
                        {lalamoveQuoteLoading && <p className="text-xs text-ink-400">Getting a delivery estimate…</p>}
                        {lalamoveQuoteError && <p className="text-xs text-flash-600">{lalamoveQuoteError}</p>}
                        {lalamoveFeePhp !== null && (
                          <p className="text-xs text-ink-400">
                            Estimated delivery fee: {formatPeso(lalamoveFeePhp)} — final SF confirmed via DM.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Full name"
                        value={name}
                        onChange={setName}
                        autoComplete="name"
                        placeholder="Juan Dela Cruz"
                        required
                      />
                      <Field
                        label="Phone"
                        value={phone}
                        onChange={setPhone}
                        type="tel"
                        autoComplete="tel"
                        placeholder="09171234567"
                        required
                      />
                    </div>
                    <Field
                      label="Email"
                      value={email}
                      onChange={setEmail}
                      type="email"
                      autoComplete="email"
                      placeholder="juan@gmail.com"
                      required
                    />
                    <Field
                      label="Address line 1"
                      value={line1}
                      onChange={setLine1}
                      autoComplete="address-line1"
                      placeholder="123 Sampaguita St., Brgy. San Isidro"
                      required
                    />
                    <Field
                      label="Address line 2 (optional)"
                      value={line2}
                      onChange={setLine2}
                      autoComplete="address-line2"
                      placeholder="Unit / floor, landmark, etc."
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Combobox
                        label="Province"
                        value={province}
                        onSelect={selectProvince}
                        options={PROVINCES}
                        placeholder="Search province…"
                        required
                      />
                      <Combobox
                        label="City / Municipality"
                        value={city}
                        onSelect={selectCity}
                        options={cityOptions}
                        placeholder="Search city…"
                        required
                      />
                      <Field
                        label="Postal code"
                        value={postalCode}
                        onChange={setPostalCode}
                        autoComplete="postal-code"
                        placeholder="1000"
                        required
                      />
                    </div>

                    {lalamoveIneligible && (
                      <div className="flex items-start gap-2 rounded-2xl bg-flash-500/10 px-4 py-3 text-sm text-flash-600">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>Lalamove is only available within Metro Manila — please choose LBC or DHL instead.</p>
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
                      disabled={
                        submitting ||
                        lalamoveIneligible ||
                        (shippingMethod === "lalamove" && !dropoffPin) ||
                        (fulfillmentMethod === "online" && !proofFile)
                      }
                      className="btn-shine flex items-center justify-center gap-2 rounded-full bg-flash-500 px-6 py-4 text-sm font-semibold text-cream-50 shadow-xl shadow-flash-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:bg-flash-600 disabled:pointer-events-none disabled:opacity-60"
                    >
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {paymentPlan === "layaway" ? "Submit down payment" : "Place order"}
                    </button>
                </>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function RequiredMark() {
  return (
    <span className="text-flash-500" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium text-ink-500">
        {label}
        {required && <RequiredMark />}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className="rounded-xl border border-ink-900/10 bg-cream-50 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400/50 transition-colors focus:border-flash-500/60 focus:outline-none"
      />
    </label>
  );
}

// Searchable select: free-text filters the option list, but the value only "sticks"
// via onSelect (picking an option) — this keeps City/Province constrained to the real
// PH address dataset instead of accepting arbitrary typed text.
function Combobox({
  label,
  value,
  onSelect,
  options,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onSelect: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    return base.slice(0, 50);
  }, [query, options]);

  return (
    <div className="relative flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium text-ink-500">
        {label}
        {required && <RequiredMark />}
      </span>
      <input
        type="text"
        value={open ? query : value}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        className="rounded-xl border border-ink-900/10 bg-cream-50 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400/50 transition-colors focus:border-flash-500/60 focus:outline-none"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-ink-900/10 bg-cream-50 py-1 shadow-lg shadow-ink-900/10">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => {
                  onSelect(opt);
                  setQuery("");
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-ink-700 hover:bg-flash-500/10 hover:text-ink-900"
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
