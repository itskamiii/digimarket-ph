import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, ImageOff, Plus, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import type { ProductsState } from "../hooks/useProducts";
import type { Availability, CatalogItem } from "../lib/data";
import { formatPeso } from "../lib/format";
import { EASE, Reveal } from "./Reveal";

// Body condition score lives inside the free-text description (e.g. "Body: 9/10
// clean aesthetic condition" or "- body: 8.5 /10 scratches") — wording/casing varies
// per unit since it's copied from each camera's info sheet, not a structured field.
function extractGrade(description?: string): string | null {
  if (!description) return null;
  const match = description.match(/body\s*:?\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  return match ? `${match[1]}/10` : null;
}

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

function CameraCard({ item, onViewInfo }: { item: CatalogItem; onViewInfo: (item: CatalogItem) => void }) {
  const { addItem, isInCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const isUnavailable = item.availability !== "available";
  const inBag = isInCart("unit", item.id);

  const addToBag = () => {
    if (isUnavailable || inBag) return;
    addItem({ type: "unit", id: item.id, name: item.name, price: item.price, image: item.image });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2200);
  };

  const showAdded = justAdded || inBag;
  const grade = extractGrade(item.description);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-ink-900/8 bg-cream-50 shadow-[0_2px_20px_-8px_rgba(27,23,18,0.12)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-24px_rgba(27,23,18,0.3)]">
      <button
        type="button"
        onClick={() => onViewInfo(item)}
        aria-label={`View details for ${item.name}`}
        className="block w-full text-left"
      >
        {/* Image */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${item.tint ?? "from-cream-200"} to-cream-100`}>
          {item.image ? (
            <img
              src={item.image}
              alt={`${item.name} — vintage digital camera`}
              loading="lazy"
              width={720}
              height={900}
              className="aspect-[4/4.6] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] group-hover:rotate-1"
            />
          ) : (
            <div className="flex aspect-[4/4.6] w-full flex-col items-center justify-center gap-2 text-ink-300">
              <ImageOff className="h-8 w-8" strokeWidth={1.5} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">No photo</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          {/* Collection/promo ribbon — separate corner from the badges column below so a
              long "Best for" line never wraps under it. */}
          {item.badge && (
            <span className="absolute right-4 top-4 rounded-full bg-flash-500 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-cream-50 shadow-lg shadow-flash-500/30">
              {item.badge}
            </span>
          )}

          {/* Badges */}
          <div className="absolute left-4 right-4 top-4 flex flex-col items-start gap-2">
            {item.bestFor && (
              <span className="rounded-xl bg-ink-900/70 px-2.5 py-1.5 text-[10px] leading-snug text-cream-100 backdrop-blur">
                <span className="font-bold uppercase tracking-wide text-flash-400">Best for </span>
                {item.bestFor}
              </span>
            )}
            {item.availability === "sold" && (
              <span className="rounded-full bg-cream-50/90 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-900 backdrop-blur">
                Sold
              </span>
            )}
            {item.availability === "reserved" && (
              <span className="rounded-full bg-cream-50/90 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-900 backdrop-blur">
                Reserved
              </span>
            )}
          </div>
        </div>

        {/* Name row */}
        <div className="flex items-start justify-between gap-3 p-5 pb-0 sm:px-6 sm:pt-6">
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-ink-900">{item.name}</h3>
            {grade && (
              <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                {grade}
              </p>
            )}
          </div>
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-900/10 text-ink-400 transition-all duration-300 group-hover:rotate-45 group-hover:border-flash-500 group-hover:text-flash-500">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </button>

      {/* Price + add-to-bag */}
      <div className="flex flex-1 flex-col justify-end p-5 pt-4 sm:p-6 sm:pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            {!isUnavailable && (
              <>
                {item.oldPrice && (
                  <p className="font-mono text-[11px] text-ink-400 line-through">{formatPeso(item.oldPrice)}</p>
                )}
                <p className="font-display text-2xl font-bold tracking-tight text-ink-900">{formatPeso(item.price)}</p>
              </>
            )}
          </div>

          <motion.button
            type="button"
            onClick={addToBag}
            whileTap={{ scale: 0.94 }}
            disabled={isUnavailable}
            aria-label={isUnavailable ? `${item.name} unavailable` : `Add ${item.name} to bag`}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 ${
              isUnavailable
                ? "cursor-not-allowed bg-ink-900/10 text-ink-400"
                : showAdded
                  ? "bg-lcd-500 text-white shadow-lg shadow-lcd-500/30"
                  : "bg-ink-900 text-cream-50 shadow-lg shadow-ink-900/25 hover:bg-flash-500 hover:shadow-flash-500/35"
            }`}
          >
            {isUnavailable ? (
              item.availability === "reserved" ? (
                "Reserved"
              ) : (
                "Sold"
              )
            ) : showAdded ? (
              <>
                <Check className="h-4 w-4" strokeWidth={3} /> In bag
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" strokeWidth={3} /> Add to bag
              </>
            )}
          </motion.button>
        </div>
      </div>
    </article>
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

// Digicam brand isn't a clean DB field (the `brand` column only distinguishes
// Sony/Nikon/Others from the old grouping) — every unit name reliably starts with its
// real brand word, so bucket off that instead of touching the schema.
const KNOWN_DIGICAM_BRANDS = ["Sony", "Nikon", "Casio", "Panasonic", "Olympus"];
function getBrandBucket(name: string): string {
  const first = name.split(" ")[0];
  return KNOWN_DIGICAM_BRANDS.includes(first) ? first : "Others";
}

// Folded into Showcase — see App.tsx / Showcase.tsx. Renders the tab switcher + full
// image-card grid (every unit — available, reserved, and sold), no section heading of
// its own; Showcase's heading covers it.
export function CatalogList({ products }: { products: ProductsState }) {
  const [active, setActive] = useState<"camcorders" | "digicams">("camcorders");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [infoItem, setInfoItem] = useState<CatalogItem | null>(null);

  const camcorders = products.status === "ready" ? products.data.camcorders : [];
  const digicams = products.status === "ready" ? products.data.digicams : [];

  const digicamBrands = [...KNOWN_DIGICAM_BRANDS, "Others"].filter((b) =>
    digicams.some((item) => getBrandBucket(item.name) === b)
  );
  const filteredDigicams =
    brandFilter === "all" ? digicams : digicams.filter((item) => getBrandBucket(item.name) === brandFilter);

  const activeItems = active === "camcorders" ? camcorders : filteredDigicams;

  const selectTab = (tab: "camcorders" | "digicams") => {
    setActive(tab);
    setBrandFilter("all");
  };

  return (
    <div id="catalog" className="mt-12 lg:mt-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Reveal delay={0.14} className="flex flex-wrap gap-2">
          {(["camcorders", "digicams"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => selectTab(tab)}
              className={`rounded-full px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-300 ${
                active === tab ? "bg-ink-900 text-cream-50" : "bg-ink-900/6 text-ink-500 hover:bg-ink-900/12"
              }`}
            >
              {tab === "camcorders" ? "Camcorders" : "Digicams"}
            </button>
          ))}
        </Reveal>
        <Reveal delay={0.18}>
          <p className="text-xs leading-relaxed text-ink-400 sm:text-right">
            Shipping fee is cash on delivery, shouldered by the buyer. Tap a camera for full details.
          </p>
        </Reveal>
      </div>

      {active === "digicams" && digicamBrands.length > 0 && (
        <Reveal delay={0.2} className="mt-3 flex flex-wrap gap-1.5">
          {["all", ...digicamBrands].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBrandFilter(b)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-300 ${
                brandFilter === b
                  ? "border-flash-500 bg-flash-500 text-cream-50"
                  : "border-ink-900/10 text-ink-400 hover:border-flash-500 hover:text-flash-500"
              }`}
            >
              {b === "all" ? "All" : b}
            </button>
          ))}
        </Reveal>
      )}

      {products.status === "loading" && (
        <p className="mt-10 text-center text-sm text-ink-400">Loading the catalog…</p>
      )}
      {products.status === "error" && (
        <p className="mt-10 text-center text-sm text-flash-600">{products.message}</p>
      )}
      {products.status === "ready" && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeItems.map((item, i) => (
            <motion.div
              key={item.id}
              className="h-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.04, ease: EASE }}
            >
              <CameraCard item={item} onViewInfo={setInfoItem} />
            </motion.div>
          ))}
        </div>
      )}

      <UnitInfoModal item={infoItem} onClose={() => setInfoItem(null)} />
    </div>
  );
}
