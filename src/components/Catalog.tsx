import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, ImageOff, Images, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

  // Flip to the back photo on hover (mouse) or press-and-hold (touch). Pointer Events
  // unify both input types in one handler set — touch devices do fire synthetic mouse
  // events on tap, which would otherwise flash the back photo for an instant on every
  // tap, so every handler below checks pointerType rather than assuming which fired.
  const [flipped, setFlipped] = useState(false);
  const hasBack = Boolean(item.imageBack);
  const holdTimerRef = useRef<number | null>(null);
  // Distinguishes "held past the threshold" from "quick tap" so the click handler can
  // skip opening the info modal for a hold, without affecting a normal tap's click.
  const holdTriggeredRef = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };
  const endHold = () => {
    clearHoldTimer();
    if (holdTriggeredRef.current) setFlipped(false);
  };
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && hasBack) setFlipped(true);
  };
  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setFlipped(false);
    endHold();
  };
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || !hasBack) return;
    holdTimerRef.current = window.setTimeout(() => {
      holdTriggeredRef.current = true;
      setFlipped(true);
    }, 350);
  };
  const handleClick = () => {
    if (holdTriggeredRef.current) {
      holdTriggeredRef.current = false;
      return;
    }
    onViewInfo(item);
  };

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
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        aria-label={`View details for ${item.name}`}
        className="block w-full text-left"
      >
        {/* Image */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${item.tint ?? "from-cream-200"} to-cream-100`}>
          {item.image ? (
            <>
              <img
                src={item.image}
                alt={`${item.name} — vintage digital camera`}
                loading="lazy"
                width={720}
                height={900}
                className={`aspect-[4/4.6] w-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.06] group-hover:rotate-1 ${
                  flipped ? "opacity-0" : "opacity-100"
                }`}
              />
              {hasBack && (
                <img
                  src={item.imageBack}
                  alt={`${item.name} — back of camera`}
                  loading="lazy"
                  width={720}
                  height={900}
                  className={`absolute inset-0 aspect-[4/4.6] w-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.06] group-hover:rotate-1 ${
                    flipped ? "opacity-100" : "opacity-0"
                  }`}
                />
              )}
            </>
          ) : (
            <div className="flex aspect-[4/4.6] w-full flex-col items-center justify-center gap-2 text-ink-300">
              <ImageOff className="h-8 w-8" strokeWidth={1.5} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">No photo</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

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

function UnitInfoModal({
  item,
  onClose,
  onViewSamples,
}: {
  item: CatalogItem | null;
  onClose: () => void;
  onViewSamples: (item: CatalogItem) => void;
}) {
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

              {item.samplePhotos && item.samplePhotos.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onViewSamples(item)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-ink-900/12 px-6 py-4 text-sm font-semibold text-ink-700 transition-all duration-300 hover:border-ink-900/25 hover:bg-ink-900/4"
                >
                  <Images className="h-4 w-4" />
                  View sample photos
                </button>
              ) : (
                <p className="mt-3 flex items-center justify-center gap-2 rounded-full bg-ink-900/6 px-6 py-3 text-center text-xs font-semibold text-ink-400">
                  <Images className="h-3.5 w-3.5 shrink-0" />
                  Sorry, sample photos are unavailable yet — coming soon!
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Full-screen swipeable gallery of real photos taken BY the camera (not of it) — opened
// from "View sample photos" in UnitInfoModal. Paginated like an Instagram post carousel:
// drag/swipe snaps to the next or previous photo (not a continuous scroll), with dot
// indicators below. Stacks on top of UnitInfoModal (higher z-index) rather than closing
// it, so dismissing this returns to the info modal instead of the whole catalog.
function SamplePhotoViewer({ item, onClose }: { item: CatalogItem | null; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const photos = item?.samplePhotos ?? [];

  useEffect(() => {
    setIndex(0);
  }, [item?.id]);

  const goTo = (i: number) => setIndex(Math.min(Math.max(i, 0), photos.length - 1));

  return (
    <AnimatePresence>
      {item && photos.length > 0 && (
        <motion.div
          key="sample-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          role="dialog"
          aria-modal="true"
          aria-label={`${item.name} — sample photos`}
          className="fixed inset-0 z-[110] flex flex-col bg-ink-950/97"
        >
          <div className="flex items-center justify-between px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
            <p className="truncate pr-4 text-sm font-semibold text-cream-50">{item.name}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sample photos"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-50/10 text-cream-50 transition-colors hover:bg-cream-50/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.img
                key={index}
                src={photos[index]}
                alt={`${item.name} — sample photo ${index + 1} of ${photos.length}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) goTo(index + 1);
                  else if (info.offset.x > 60) goTo(index - 1);
                }}
                className="absolute inset-0 h-full w-full touch-pan-y object-contain"
              />
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-1.5 py-5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to sample photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-5 bg-flash-500" : "w-1.5 bg-cream-50/30"
                }`}
              />
            ))}
          </div>
        </motion.div>
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
  const [catalogFilter, setCatalogFilter] = useState<string>("all");
  const [infoItem, setInfoItem] = useState<CatalogItem | null>(null);
  const [samplePhotosItem, setSamplePhotosItem] = useState<CatalogItem | null>(null);

  const camcorders = products.status === "ready" ? products.data.camcorders : [];
  const digicams = products.status === "ready" ? products.data.digicams : [];

  const digicamBrands = [...KNOWN_DIGICAM_BRANDS, "Others"].filter((b) =>
    digicams.some((item) => getBrandBucket(item.name) === b)
  );
  // Collection chips (e.g. "28th Collection") come straight from units.badge — same
  // self-adapting pattern as brands: a chip only appears once a unit with that badge
  // actually exists, so future collections show up here with zero code changes. Sorted
  // newest-first by the leading ordinal number (29th before 28th) rather than whatever
  // order units happen to come back in, so this doesn't need re-fixing every drop.
  const collectionNumber = (badge: string): number => parseInt(badge, 10) || -1;
  const digicamCollections = [...new Set(digicams.map((item) => item.badge).filter((b): b is string => Boolean(b)))].sort(
    (a, b) => collectionNumber(b) - collectionNumber(a)
  );
  const filteredDigicams =
    catalogFilter === "all"
      ? digicams
      : digicams.filter((item) =>
          digicamCollections.includes(catalogFilter)
            ? item.badge === catalogFilter
            : getBrandBucket(item.name) === catalogFilter
        );

  const activeItems = active === "camcorders" ? camcorders : filteredDigicams;

  const selectTab = (tab: "camcorders" | "digicams") => {
    setActive(tab);
    setCatalogFilter("all");
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

      {active === "digicams" && (digicamCollections.length > 0 || digicamBrands.length > 0) && (
        <Reveal delay={0.2} className="mt-3 flex flex-wrap gap-1.5">
          {["all", ...digicamCollections, ...digicamBrands].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setCatalogFilter(f)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-300 ${
                catalogFilter === f
                  ? "border-flash-500 bg-flash-500 text-cream-50"
                  : "border-ink-900/10 text-ink-400 hover:border-flash-500 hover:text-flash-500"
              }`}
            >
              {f === "all" ? "All" : f}
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

      <UnitInfoModal item={infoItem} onClose={() => setInfoItem(null)} onViewSamples={setSamplePhotosItem} />
      <SamplePhotoViewer item={samplePhotosItem} onClose={() => setSamplePhotosItem(null)} />
    </div>
  );
}
