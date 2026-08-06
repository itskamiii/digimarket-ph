import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatPeso } from "../lib/format";
import { EASE } from "./Reveal";

export default function CartDrawer({ onCheckout }: { onCheckout: () => void }) {
  const { items, itemCount, subtotal, isOpen, closeCart, removeItem, setQuantity } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
            aria-hidden="true"
            className="fixed inset-0 z-[70] bg-ink-950/50 backdrop-blur-sm"
          />
          <motion.aside
            key="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            className="glass fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col shadow-2xl shadow-ink-900/30"
          >
            <div className="flex items-center justify-between border-b border-ink-900/8 px-6 py-5">
              <h2 className="font-display text-lg font-bold text-ink-900">
                Your bag {itemCount > 0 && <span className="text-flash-500">({itemCount})</span>}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close bag"
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-900/8 hover:text-ink-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-900/6 text-ink-400">
                  <ShoppingBag className="h-6 w-6" />
                </span>
                <p className="text-sm text-ink-500">Your bag is empty — go find your era.</p>
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto px-6 py-4">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-4 border-b border-ink-900/8 py-4 last:border-b-0">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cream-200">
                      {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink-900">{item.name}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Remove ${item.name} from bag`}
                          className="shrink-0 text-ink-300 transition-colors hover:text-flash-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <p className="font-display text-sm font-bold text-ink-900">{formatPeso(item.price)}</p>
                        {item.type === "kit" ? (
                          <div className="flex items-center gap-2 rounded-full border border-ink-900/10 px-1">
                            <button
                              type="button"
                              onClick={() => setQuantity(item.key, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-ink-500 disabled:opacity-30"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-4 text-center font-mono text-xs font-bold text-ink-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(item.key, item.quantity + 1)}
                              disabled={item.quantity >= 5}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-ink-500 disabled:opacity-30"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                            1 of 1 · one-of-a-kind
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {items.length > 0 && (
              <div className="border-t border-ink-900/8 px-6 py-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">Subtotal</span>
                  <span className="font-display text-lg font-bold text-ink-900">{formatPeso(subtotal)}</span>
                </div>
                <p className="mt-1 text-xs text-ink-400">Shipping fee is COD, paid to the courier on delivery.</p>
                <button
                  type="button"
                  onClick={onCheckout}
                  className="btn-shine mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-flash-500 px-6 py-4 text-sm font-semibold text-cream-50 shadow-xl shadow-flash-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:bg-flash-600"
                >
                  Checkout
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
