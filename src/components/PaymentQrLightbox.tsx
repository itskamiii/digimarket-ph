import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { PaymentQrCode } from "../lib/api";
import { EASE } from "./Reveal";

// Full-screen expand for a tapped QR thumbnail — the grid on Checkout/PayBalance is
// deliberately small (fits several side by side), too small to reliably scan, so tapping
// one blows it up large enough to actually use. Shared between Checkout.tsx and
// PayBalance.tsx rather than duplicated, since both show the exact same QR grid.
// z-[120] sits above both of those modals (z-[95]) regardless of which one is open.
export default function PaymentQrLightbox({ qr, onClose }: { qr: PaymentQrCode | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {qr && (
        <motion.div
          key="qr-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          role="dialog"
          aria-modal="true"
          aria-label={`${qr.label} QR code`}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-5 bg-ink-950/95 p-6"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-cream-50/10 text-cream-50 transition-colors hover:bg-cream-50/20"
          >
            <X className="h-5 w-5" />
          </button>

          <motion.img
            key={qr.imageUrl}
            src={qr.imageUrl}
            alt={`${qr.label} QR code`}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[75vh] w-full max-w-sm rounded-3xl bg-cream-50 object-contain p-4 shadow-2xl"
          />
          <p className="font-display text-lg font-bold text-cream-50">{qr.label}</p>
          <p className="text-xs text-cream-100/50">Tap anywhere to close</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}