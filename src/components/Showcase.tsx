import { motion } from "framer-motion";
import { ArrowUpRight, Check, Flame, Plus } from "lucide-react";
import { useState } from "react";
import { CAMERAS, type Camera } from "../lib/data";
import { Eyebrow, Reveal, Stagger, StaggerItem } from "./Reveal";

const peso = (n: number) => "₱" + n.toLocaleString("en-PH");

function CameraCard({ camera }: { camera: Camera }) {
  const [added, setAdded] = useState(false);
  const isUnavailable = camera.availability !== "available";

  const addToBag = () => {
    if (added || isUnavailable) return;
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-ink-900/8 bg-cream-50 shadow-[0_2px_20px_-8px_rgba(27,23,18,0.12)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_-24px_rgba(27,23,18,0.3)]">
      {/* Image */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${camera.tint} to-cream-100`}>
        <img
          src={camera.image}
          alt={`${camera.name} — restored vintage digital camera`}
          loading="lazy"
          width={720}
          height={900}
          className="aspect-[4/4.6] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] group-hover:rotate-1"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Badges */}
        <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-ink-900/85 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cream-50 backdrop-blur">
            <Flame className="h-3 w-3 text-flash-400" />
            {camera.badge}
          </span>
          {camera.availability === "sold" && (
            <span className="rounded-full bg-cream-50/90 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-900 backdrop-blur">
              Sold
            </span>
          )}
          {camera.availability === "reserved" && (
            <span className="rounded-full bg-cream-50/90 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-900 backdrop-blur">
              Reserved
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-ink-900">
              {camera.name}
            </h3>
            <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
              Hand-restored · Grade A
            </p>
          </div>
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-900/10 text-ink-400 transition-all duration-300 group-hover:rotate-45 group-hover:border-flash-500 group-hover:text-flash-500">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 pt-1">
          <div>
            {camera.oldPrice && (
              <p className="font-mono text-[11px] text-ink-400 line-through">
                {peso(camera.oldPrice)}
              </p>
            )}
            <p className="font-display text-2xl font-bold tracking-tight text-ink-900">
              {peso(camera.price)}
            </p>
          </div>

          <motion.button
            type="button"
            onClick={addToBag}
            whileTap={{ scale: 0.94 }}
            disabled={isUnavailable}
            aria-label={isUnavailable ? `${camera.name} unavailable` : `Add ${camera.name} to bag`}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 ${
              isUnavailable
                ? "cursor-not-allowed bg-ink-900/10 text-ink-400"
                : added
                  ? "bg-lcd-500 text-white shadow-lg shadow-lcd-500/30"
                  : "bg-ink-900 text-cream-50 shadow-lg shadow-ink-900/25 hover:bg-flash-500 hover:shadow-flash-500/35"
            }`}
          >
            {isUnavailable ? (
              camera.availability === "reserved" ? "Reserved" : "Join waitlist"
            ) : added ? (
              <>
                <Check className="h-4 w-4" strokeWidth={3} /> Added!
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

export default function Showcase() {
  return (
    <section id="drop" className="relative overflow-hidden py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-40 h-[480px] w-[480px] rounded-full bg-flash-300/15 blur-[130px]"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <Reveal>
              <Eyebrow>The current drop</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
                This week's picks.
                <br />
                <span className="text-flash-500">Full catalog below.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.16}>
            <p className="max-w-sm text-sm leading-relaxed text-ink-500 md:text-right">
              Each unit is one-of-a-kind — we photograph every camera individually. What you see
              is exactly what lands on your doorstep.
            </p>
          </Reveal>
        </div>

        <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3" amount={0.08}>
          {CAMERAS.map((camera) => (
            <StaggerItem key={camera.id} className="h-full">
              <CameraCard camera={camera} />
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.1} className="mt-12 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-ink-400">
            Unit shown may vary slightly — that's the beauty of vintage
          </p>
        </Reveal>
      </div>
    </section>
  );
}
