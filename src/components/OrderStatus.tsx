import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { fetchOrderStatus } from "../lib/api";
import { formatPeso } from "../lib/format";
import { EASE } from "./Reveal";
import type { ShippingMethod } from "../../server/types";

type PaidState = {
  kind: "paid";
  orderId: string;
  shippingMethod: ShippingMethod;
  layawayBalancePhp: number | null;
  layawayBalanceDueAt: string | null;
};

type ViewState =
  | { kind: "hidden" }
  | { kind: "confirming"; orderId: string }
  | PaidState
  | { kind: "pending"; orderId: string } // PayMongo accepted the payment but our webhook hasn't landed yet
  | { kind: "cancelled" };

// Item is paid at this point either way — Lalamove/DHL delivery still gets arranged
// manually afterward (no automatic booking or rate quoting for either). "meetup"/"pickup"
// can never reach this screen in practice (they always require fulfillmentMethod "cod",
// so checkout never redirects to PayMongo for them), but the map is typed over the full
// ShippingMethod union for exhaustiveness.
const PAID_MESSAGE: Record<ShippingMethod, string> = {
  lbc: "Thanks for shopping the drop — we'll DM or email you shipping details shortly.",
  lalamove: "Thanks for shopping the drop — we'll DM you on Instagram to arrange your Lalamove delivery.",
  dhl: "Thanks for shopping the drop — we'll DM you on Instagram to arrange your DHL shipment.",
  meetup: "Thanks for shopping the drop — we'll DM you on Instagram to set the meet-up time and place.",
  pickup: "Thanks for shopping the drop — we'll DM you on Instagram to arrange a pickup time.",
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10;

// Reads `?order=&status=` left by a PayMongo redirect (see api/checkout.ts's
// success_url / api/checkout/cancel.ts) and shows the matching outcome. No router
// needed — this is the one redirect-return case on an otherwise anchor-nav SPA.
export default function OrderStatus() {
  const { clear } = useCart();
  const [state, setState] = useState<ViewState>({ kind: "hidden" });
  const clearedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");
    const status = params.get("status");
    if (!orderId && !status) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("order");
    url.searchParams.delete("status");
    window.history.replaceState({}, "", url.toString());

    if (status === "cancelled") {
      setState({ kind: "cancelled" });
    } else if (status === "success" && orderId) {
      setState({ kind: "confirming", orderId });
    }
  }, []);

  useEffect(() => {
    if (state.kind !== "confirming") return;
    const orderId = state.orderId;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const result = await fetchOrderStatus(orderId);
        if (cancelled) return;
        if (result.status === "paid" || result.status === "fulfilled") {
          if (!clearedRef.current) {
            clear();
            clearedRef.current = true;
          }
          setState({
            kind: "paid",
            orderId,
            shippingMethod: result.shippingMethod,
            layawayBalancePhp: result.paymentPlan === "layaway" ? result.layawayBalancePhp : null,
            layawayBalanceDueAt: result.paymentPlan === "layaway" ? result.layawayBalanceDueAt : null,
          });
          return;
        }
      } catch {
        // Transient fetch failure — keep polling rather than flipping to an error state.
      }
      if (cancelled) return;
      if (attempts >= MAX_POLLS) {
        setState({ kind: "pending", orderId });
      } else {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [state.kind, state.kind === "confirming" ? state.orderId : null, clear]);

  const close = () => setState({ kind: "hidden" });
  const visible = state.kind !== "hidden";

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="order-status-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={state.kind === "confirming" ? undefined : close}
            aria-hidden="true"
            className="fixed inset-0 z-[90] bg-ink-950/60 backdrop-blur-sm"
          />
          <motion.div
            key="order-status-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.35, ease: EASE }}
            role="status"
            className="fixed inset-x-4 top-1/2 z-[95] mx-auto max-w-md -translate-y-1/2 rounded-[2rem] bg-cream-50 p-8 text-center shadow-2xl shadow-ink-900/40 sm:inset-x-auto"
          >
            {state.kind === "confirming" && (
              <>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-flash-500" />
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Confirming your payment…</p>
                <p className="mt-1 text-sm text-ink-500">This only takes a few seconds.</p>
              </>
            )}
            {state.kind === "paid" && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lcd-500/15 text-lcd-500">
                  <Check className="h-7 w-7" strokeWidth={3} />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-ink-900">
                  {state.layawayBalancePhp !== null ? "Down payment confirmed!" : "Payment confirmed!"}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  {state.layawayBalancePhp !== null && state.layawayBalanceDueAt
                    ? `Your unit is reserved. Balance of ${formatPeso(state.layawayBalancePhp)} is due by ${new Date(state.layawayBalanceDueAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })} — we'll DM you a payment breakdown.`
                    : PAID_MESSAGE[state.shippingMethod]}
                </p>
                <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                  Order #{state.orderId.slice(0, 8)}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-cream-50"
                >
                  Done
                </button>
              </>
            )}
            {state.kind === "pending" && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-flash-500/15 text-flash-500">
                  <Check className="h-7 w-7" strokeWidth={3} />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Payment received!</p>
                <p className="mt-1 text-sm text-ink-500">
                  We're still confirming your order on our end — this can take a minute. We'll reach out once it's
                  set.
                </p>
                <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                  Order #{state.orderId.slice(0, 8)}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-cream-50"
                >
                  Done
                </button>
              </>
            )}
            {state.kind === "cancelled" && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink-900/8 text-ink-500">
                  <X className="h-7 w-7" strokeWidth={3} />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Payment cancelled</p>
                <p className="mt-1 text-sm text-ink-500">
                  No charge was made. Your bag is still saved — pick up whenever you're ready.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-cream-50"
                >
                  Got it
                </button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
