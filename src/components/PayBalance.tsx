import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Loader2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchPayBalanceStatus,
  fetchPaymentQrCodes,
  submitPayBalanceProof,
  uploadPaymentProof,
  type PaymentQrCode,
  type PayBalanceStatus,
} from "../lib/api";
import { formatPeso } from "../lib/format";
import PaymentQrLightbox from "./PaymentQrLightbox";
import { EASE } from "./Reveal";

type ViewState =
  | { kind: "hidden" }
  | { kind: "loading"; orderId: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; orderId: string; status: PayBalanceStatus }
  | { kind: "submitting"; orderId: string }
  | { kind: "submitted" };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

// Reads `?payBalance=<orderId>` — the link the owner sends a layaway customer once it's
// time to collect the remaining balance. No router needed, same query-param pattern as
// OrderStatus.tsx. Balance payment is the same manual QR + proof-of-payment flow as
// checkout's down payment now — there's no payment-gateway redirect to poll for anymore,
// so submitting proof just ends the flow; the owner verifies it from their own email.
export default function PayBalance() {
  const [state, setState] = useState<ViewState>({ kind: "hidden" });
  const [qrCodes, setQrCodes] = useState<PaymentQrCode[]>([]);
  const [expandedQr, setExpandedQr] = useState<PaymentQrCode | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("payBalance");
    if (!orderId) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("payBalance");
    url.searchParams.delete("paid"); // stale param from the old PayMongo redirect flow
    window.history.replaceState({}, "", url.toString());

    setState({ kind: "loading", orderId });
    fetchPaymentQrCodes().then(setQrCodes);
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

  const close = () => {
    setState({ kind: "hidden" });
    setProofFile(null);
    setFileError(null);
    setExpandedQr(null);
  };

  const submitProof = async (orderId: string) => {
    if (!proofFile) {
      setFileError("Please upload your proof of payment.");
      return;
    }
    setFileError(null);
    setState({ kind: "submitting", orderId });
    try {
      const { path } = await uploadPaymentProof(proofFile);
      await submitPayBalanceProof(orderId, path);
      setState({ kind: "submitted" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't submit your proof — please try again." });
    }
  };

  const visible = state.kind !== "hidden";

  return (
    <>
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="pay-balance-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={state.kind === "submitting" ? undefined : close}
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
            className="fixed inset-x-4 top-1/2 z-[95] mx-auto max-h-[88vh] max-w-md -translate-y-1/2 overflow-y-auto rounded-[2rem] bg-cream-50 p-8 text-center shadow-2xl shadow-ink-900/40 sm:inset-x-auto"
          >
            {state.kind === "loading" && (
              <>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-flash-500" />
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Loading your order…</p>
                <p className="mt-1 text-sm text-ink-500">This only takes a few seconds.</p>
              </>
            )}

            {state.kind === "ready" && state.status.balancePhp !== null && state.status.balancePhp <= 0 && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lcd-500/15 text-lcd-500">
                  <Check className="h-7 w-7" strokeWidth={3} />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Balance already paid off!</p>
                <p className="mt-1 text-sm text-ink-500">Nothing left to collect on this order.</p>
                <button type="button" onClick={close} className="mt-5 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-cream-50">
                  Done
                </button>
              </>
            )}

            {state.kind === "ready" && (state.status.balancePhp === null || state.status.balancePhp > 0) && (
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

                <div className="mt-5 rounded-2xl border border-ink-900/8 bg-cream-100/60 p-4 text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                    Scan to pay {formatPeso(state.status.balancePhp ?? 0)}
                  </p>
                  {qrCodes.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {qrCodes.map((qr) => (
                        <button
                          key={qr.imageUrl}
                          type="button"
                          onClick={() => setExpandedQr(qr)}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <img
                            src={qr.imageUrl}
                            alt={`${qr.label} QR code — tap to enlarge`}
                            className="aspect-square w-full rounded-xl border border-ink-900/8 bg-cream-50 object-contain p-1.5 transition-transform duration-200 active:scale-95"
                          />
                          <span className="text-xs font-semibold text-ink-700">{qr.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-ink-500">
                      Our QR codes aren't loaded yet — message us on Instagram to arrange payment.
                    </p>
                  )}

                  <label htmlFor="balance-proof" className="mt-4 block text-xs font-medium text-ink-500">
                    Proof of payment <span className="text-flash-500">*</span>
                  </label>
                  <label
                    htmlFor="balance-proof"
                    className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-900/20 bg-cream-50 px-4 py-3 text-sm text-ink-500 transition-colors hover:border-flash-500/50"
                  >
                    <Upload className="h-4 w-4 shrink-0" />
                    <span className="truncate">{proofFile ? proofFile.name : "Upload a screenshot or receipt"}</span>
                  </label>
                  <input
                    id="balance-proof"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  {fileError && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-flash-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {fileError}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => submitProof(state.orderId)}
                  className="btn-shine mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-flash-500 px-6 py-4 text-sm font-semibold text-cream-50 shadow-xl shadow-flash-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:bg-flash-600"
                >
                  Submit proof of payment
                </button>
                <button type="button" onClick={close} className="mt-3 text-xs font-semibold text-ink-500 hover:text-ink-900">
                  Not now
                </button>
              </>
            )}

            {state.kind === "submitting" && (
              <>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-flash-500" />
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Submitting your proof…</p>
              </>
            )}

            {state.kind === "submitted" && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lcd-500/15 text-lcd-500">
                  <Check className="h-7 w-7" strokeWidth={3} />
                </span>
                <p className="mt-4 font-display text-xl font-bold text-ink-900">Proof submitted!</p>
                <p className="mt-1 text-sm text-ink-500">
                  We're verifying your payment now and will confirm shortly — we'll DM you on Instagram once your
                  unit is fully paid off.
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

            {state.kind !== "submitting" && (
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
    <PaymentQrLightbox qr={expandedQr} onClose={() => setExpandedQr(null)} />
    </>
  );
}