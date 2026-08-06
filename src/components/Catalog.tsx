import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import type { ProductsState } from "../hooks/useProducts";
import type { Availability, CatalogItem } from "../lib/data";
import { formatPeso } from "../lib/format";
import { EASE, Reveal, Stagger, StaggerItem } from "./Reveal";

function StatusPill({ availability }: { availability: Availability }) {
  if (availability === "sold") {
    return (
      <span className="rounded-full bg-ink-900/8 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
        Sold
      </span>
    );
  }
  if (availability === "reserved") {
    return (
      <span className="rounded-full bg-flash-500/12 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-flash-500">
        Reserved
      </span>
    );
  }
  return null;
}

function CatalogRow({ item, onViewInfo }: { item: CatalogItem; onViewInfo: (item: CatalogItem) => void }) {
  const { addItem, isInCart } = useCart();
  const isAvailable = item.availability === "available";
  const inBag = isInCart("unit", item.id);

  return (
    <li
      className={`flex items-center justify-between gap-4 border-b border-ink-900/8 py-3.5 last:border-b-0 ${
        !isAvailable ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onViewInfo(item)}
        className="text-left text-sm font-medium text-ink-900 underline decoration-ink-900/20 underline-offset-4 transition-colors duration-300 hover:text-flash-500 hover:decoration-flash-500 sm:text-base"
      >
        {item.name}
      </button>
      <span className="flex shrink-0 items-center gap-3">
        <StatusPill availability={item.availability} />
        {isAvailable && (
          <>
            <span className="font-display text-sm font-bold text-ink-900 sm:text-base">{formatPeso(item.price)}</span>
            <button
              type="button"
              onClick={() =>
                !inBag && addItem({ type: "unit", id: item.id, name: item.name, price: item.price, image: item.image })
              }
              disabled={inBag}
              aria-label={inBag ? `${item.name} is in your bag` : `Add ${item.name} to bag`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                inBag
                  ? "bg-lcd-500/15 text-lcd-500"
                  : "bg-ink-900/8 text-ink-700 hover:bg-flash-500 hover:text-cream-50"
              }`}
            >
              {inBag ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              )}
            </button>
          </>
        )}
      </span>
    </li>
  );
}

function UnitInfoModal({ item, onClose }: { item: CatalogItem | null; onClose: () => void }) {
  const { addItem, isInCart } = useCart();
  const isAvailable = item?.availability === "available";
  const inBag = item ? isInCart("unit", item.id) : false;

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            key="unit-info-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 z-[90] bg-ink-950/60 backdrop-blur-sm"
          />
          <motion.div
            key="unit-info-panel"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
            className="fixed inset-x-4 top-1/2 z-[95] mx-auto max-h-[88vh] max-w-lg -translate-y-1/2 overflow-y-auto rounded-[2rem] bg-cream-50 shadow-2xl shadow-ink-900/40 sm:inset-x-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-900/8 bg-cream-50/95 px-6 py-5 backdrop-blur">
              <h2 className="font-display text-lg font-bold text-ink-900">{item.name}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-900/8 hover:text-ink-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            )}

            <div className="px-6 py-6">
              <div className="flex items-center gap-3">
                <StatusPill availability={item.availability} />
                {isAvailable && (
                  <span className="font-display text-2xl font-bold tracking-tight text-ink-900">
                    {formatPeso(item.price)}
                  </span>
                )}
              </div>

              {item.description ? (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-600">{item.description}</p>
              ) : (
                <p className="mt-4 text-sm text-ink-400">
                  Details for this unit are in the caption of its product post — visit our profile for photos, or
                  message us with any questions.
                </p>
              )}

              {isAvailable && (
                <button
                  type="button"
                  onClick={() =>
                    !inBag && addItem({ type: "unit", id: item.id, name: item.name, price: item.price, image: item.image })
                  }
                  disabled={inBag}
                  className={`btn-shine mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-semibold transition-all duration-300 ${
                    inBag
                      ? "bg-lcd-500/15 text-lcd-500"
                      : "bg-ink-900 text-cream-50 shadow-lg shadow-ink-900/25 hover:-translate-y-0.5 hover:bg-flash-500"
                  }`}
                >
                  {inBag ? (
                    <>
                      <Check className="h-4 w-4" strokeWidth={3} /> In bag
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" strokeWidth={3} /> Add to bag
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Folded into Showcase — see App.tsx / Showcase.tsx. Renders just the tab switcher +
// list, no section heading of its own; Showcase's heading covers it.
export function CatalogList({ products }: { products: ProductsState }) {
  const [active, setActive] = useState<"camcorders" | "digicams">("camcorders");
  const [infoItem, setInfoItem] = useState<CatalogItem | null>(null);

  const camcorders = products.status === "ready" ? products.data.camcorders : [];
  const digicams = products.status === "ready" ? products.data.digicams : [];
  const activeItems = active === "camcorders" ? camcorders : digicams;

  return (
    <div id="catalog" className="mx-auto mt-20 max-w-4xl lg:mt-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Reveal>
          <h3 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Browse the full catalog
          </h3>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="text-xs leading-relaxed text-ink-400 sm:max-w-xs sm:text-right">
            Shipping fee is cash on delivery, shouldered by the buyer. Tap a camera's name for the full details.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.14} className="mt-8 flex flex-wrap gap-2">
        {(["camcorders", "digicams"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`rounded-full px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-300 ${
              active === tab ? "bg-ink-900 text-cream-50" : "bg-ink-900/6 text-ink-500 hover:bg-ink-900/12"
            }`}
          >
            {tab === "camcorders" ? "Camcorders" : "Digicams"}
          </button>
        ))}
      </Reveal>

      {products.status === "loading" && (
        <p className="mt-10 text-center text-sm text-ink-400">Loading the catalog…</p>
      )}
      {products.status === "error" && (
        <p className="mt-10 text-center text-sm text-flash-600">{products.message}</p>
      )}
      {products.status === "ready" && (
        <Stagger className="mt-8" amount={0.05}>
          <StaggerItem>
            <ul className="rounded-[1.5rem] border border-ink-900/8 bg-cream-50 px-5 py-2 sm:px-8">
              {activeItems.map((item) => (
                <CatalogRow key={item.id} item={item} onViewInfo={setInfoItem} />
              ))}
            </ul>
          </StaggerItem>
        </Stagger>
      )}

      <UnitInfoModal item={infoItem} onClose={() => setInfoItem(null)} />
    </div>
  );
}
