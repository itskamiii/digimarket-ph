import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPayBalanceCheckout, fetchPayBalanceStatus, type PayBalanceStatus } from "../lib/api";
import { formatPeso } from "../lib/format";
import { EASE } from "./Reveal";

type ViewState =
  | { kind: "hidden" }
  | { kind: "loading"; orderId: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; orderId: string; status: PayBalanceStatus }
  | { kind: "submitting"; orderId: string }
  | { kind: "confirming"; orderId: string }
  | { kind: "paid" };

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

// Reads `?payBalance=<orderId>` (optionally with `&paid=1` right after a PayMongo
// redirect) — the link the owner sends a layaway customer once it's time to collect the
// remaining balance. No router needed, same query-param pattern as OrderStatus.tsx.
export default function PayBalance() {
  const [state, setState] = useState<ViewState>({ kind: "hidden" });
  const paidFlagRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("payBalance");
    if (!orderId) return;
    paidFlagRef.current = params.get("paid") === "1";

    const url = new URL(window.location.href);
    url.searchParams.delete("payBalance");
    url.searchParams.delete("paid");
    window.history.replaceState({}, "", url.toString());

    setState(paidFlagRef.current ? { kind: "confirming", orderId } : { kind: "loading", orderId });
  }, []);

  useEffect(() => {
    if (state.kind !== "loading") return;
    const orderId = state.orderId;
    let cancelled = false;
    fetchPayBalanceStatus(orderId)
      .then((status) => {
        if (!cancelled) setState({ kind: "ready", orderId, status });
      })
      .catch((err) => {
        if (!cancelled) setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't load this order." });
      });
    return () => {
      cancelled = true;
    };
  }, [state.kind, state.kind === "loading" ? state.orderId : null]);

  useEffect(() => {
    if (state.kind !== "confirming") return;
    const orderId = state.orderId;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const status = await fetchPayBalanceStatus(orderId);
        if (cancelled) return;
        if (status.balancePhp === 0) {
          setState({ kind: "paid" });
          return;
        }
      } catch {
        // Transient fetch failure — keep polling rather than flipping to an error state.
      }
      if (cancelled) return;
      if (attempts >= MAX_POLLS) {
        // Payment likely succeeded but the webhook hasn't landed yet — don't leave the
        // customer staring at a spinner forever.
        setState({ kind: "error", message: "Still confirming your payment — check back in a minute, or message us on Instagram if it doesn't update." });
      } else {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [state.kind, state.kind === "confirming" ? state.orderId : null]);

  const close = () => setState({ kind: "hidden" });

  const payNow = async (orderId: string) => {
    setState({ kind: "submitting", orderId });
    try {
      const { redirect } = await createPayBalanceCheckout(orderId);
      window.location.href = redirect;
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't start payment — please try again." });
    }
  };

  const visible = state.kind !== "hidden";

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="pay-balance-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={state.kind === "confirming" || state.kind === "submitting" ? undefined : close}
            aria-hidden="true"
            className="fixed inset-0 z-[90] bg-ink-950/60 backdrop-blur-sm"
          />
          <motion.div
            key="pay-balance-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.35, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Pay layaway balance"
            className="fixed inset-x-4 top-1/2 z-[95] mx-auto max-w-md -translate-y-1/2 rounded-[2rem] bg-cream-50 p-8 text-center shadow-2xl shadow-ink-900/40 sm:inset-x-auto"
          >
            {(state.kind === "loading" || state.kind === "confirming") && (
              <>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-flash-500" />
                <p className="mt-4 font-display text-xl font-bold text-ink-900">
                  {state.kind === "confirming" ? "Confirming your payment…" : "Loading your order…"}
                </p>
                <p className="mt-1 text-sm text-ink-500">This only takes a few seconds.</p>
              </>
            )}

            {state.kind === "ready" && (
              <>
                <p className="font-display text-xl font-bold text-ink-900">Layaway balance</p>
                <p className="mt-1 text-sm text-ink-500">
                  {state.status.items.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ""}${i.name}`).join(", ")}
                </p>
                <div className="mt-5 rounded-2xl border border-ink-900/8 bg-cream-100/60 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Balance due</p>
                  <p className="mt-1 font-display text-3xl font-bold text-ink-900">
                    {formatPeso(state.status.balancePhp ?? 0)}
                  </p>
                  {state.status.balanceDueAt && (
                    <p className="mt-1 text-xs text-ink-500">Due by {formatDate(state.status.balanceDueAt)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => payNow(state.orderId)}
                  className="btn-shine mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-flash-500 px-6 py-4 text-sm font-semibold text-cream-50 shadow-xl shadow-flash-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:bg-flash-600"
                >
                  Pay {formatPeso(state.status.balancePhp ?? 0)} now
                </button>
                <button type="button" onClick={close} className="mt-3 text-xs font-semibold text-ink-500 hover:text-ink-900">
                  Not now
                </button>
              </>
            )}

            {state.kind === "submitting" && (
              <>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-flash-500" />
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Taking you to payment…</p>
              </>
            )}

            {state.kind === "paid" && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lcd-500/15 text-lcd-500">
                  <Check className="h-7 w-7" strokeWidth={3} />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Balance paid in full!</p>
                <p className="mt-1 text-sm text-ink-500">
                  Your unit is fully paid off — we'll DM you on Instagram to arrange shipping.
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

            {state.kind === "error" && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-flash-500/15 text-flash-600">
                  <AlertCircle className="h-7 w-7" strokeWidth={2.5} />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Something went wrong</p>
                <p className="mt-1 text-sm text-ink-500">{state.message}</p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-cream-50"
                >
                  Close
                </button>
              </>
            )}

            {state.kind !== "submitting" && state.kind !== "confirming" && (
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-900/8 hover:text-ink-900"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}