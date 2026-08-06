import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play, Sparkles, Zap } from "lucide-react";
import heroCamera from "../assets/27th-collection.jpg";
import { EASE } from "./Reveal";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
};

const item = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};

function SpinBadge() {
  return (
    <div className="absolute -left-8 top-8 hidden h-28 w-28 items-center justify-center md:flex lg:-left-12">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full animate-spin-slow drop-shadow-sm"
        aria-hidden="true"
      >
        <defs>
          <path id="circlePath" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
        </defs>
        <circle cx="50" cy="50" r="49" fill="rgba(251,248,241,0.85)" stroke="rgba(27,23,18,0.1)" />
        <text className="fill-ink-900 font-mono text-[8.2px] font-bold uppercase" style={{ letterSpacing: "0.22em" }}>
          <textPath href="#circlePath">· est. 2004 · digimarket_ph · y2k core</textPath>
        </text>
      </svg>
      <span className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-flash-500 text-cream-50 shadow-lg shadow-flash-500/40">
        <Sparkles className="h-4.5 w-4.5" />
      </span>
    </div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section id="top" className="relative overflow-hidden pt-36 pb-16 sm:pt-40 lg:pt-44 lg:pb-24">
      {/* Ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-flash-300/20 blur-[140px]" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-lcd-400/10 blur-[120px] animate-float-slow" />
        <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-flash-400/15 blur-[110px] animate-float" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(27,23,18,0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-8">
        {/* Copy */}
        <motion.div
          variants={container}
          initial={reduce ? false : "hidden"}
          animate="show"
          className="text-center lg:text-left"
        >
          <motion.div variants={item} className="flex justify-center lg:justify-start">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-ink-900/10 bg-cream-50/80 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-flash-500 animate-pulse-dot" />
              14 Units Live
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-6xl lg:text-[4.4rem]"
          >
            Your camera roll, but{" "}
            <span className="relative inline-block">
              <span className="relative z-10 italic">make it 2004.</span>
              <svg
                className="absolute -bottom-2 left-0 w-full text-flash-500"
                viewBox="0 0 220 12"
                fill="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M3 9C60 3 160 3 217 8"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-500 sm:text-lg lg:mx-0"
          >
            Vintage digital cameras with real CCD sensors, real flash, real
            nostalgia. No filters, no presets — just point, flash, and post.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <a
              href="#drop"
              className="btn-shine group inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-flash-500 px-8 py-4 text-base font-semibold text-cream-50 shadow-xl shadow-flash-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:bg-flash-600 hover:shadow-2xl hover:shadow-flash-500/45 sm:w-auto"
            >
              Shop the collection
              <ArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <a
              href="#why"
              className="group inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-ink-900/15 bg-cream-50/70 px-8 py-4 text-base font-semibold text-ink-900 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-900/30 hover:bg-cream-50 sm:w-auto"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-cream-50 transition-transform duration-300 group-hover:scale-110">
                <Play className="h-3 w-3 fill-current" />
              </span>
              Why digicam?
            </a>
          </motion.div>
        </motion.div>

        {/* Visual */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.45, ease: EASE }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <SpinBadge />

          {/* Glow behind card */}
          <div
            aria-hidden="true"
            className="absolute inset-6 rounded-[3rem] bg-gradient-to-tr from-flash-400/30 via-flash-300/20 to-lcd-400/15 blur-2xl"
          />

          <div className="relative overflow-hidden rounded-[2.5rem] border border-ink-900/10 bg-cream-50 shadow-[0_40px_90px_-30px_rgba(27,23,18,0.45)]">
            <img
              src={heroCamera}
              alt="Flatlay of the 27th Collection — ten vintage digital cameras with a leather case, styled by Digimarket_PH"
              className="aspect-[4/5] w-full object-cover"
              width={880}
              height={1100}
            />
          </div>

          {/* Floating spec chips */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.7, ease: EASE }}
            className="absolute -left-3 top-10 sm:-left-8"
          >
            <div className="animate-float rounded-2xl glass px-4 py-3 shadow-xl shadow-ink-900/10">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-400">Collection</p>
              <p className="mt-0.5 font-display text-sm font-bold text-ink-900">27th</p>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.15, duration: 0.7, ease: EASE }}
            className="absolute -right-3 top-1/3 sm:-right-8"
          >
            <div className="animate-float rounded-2xl glass px-4 py-3 shadow-xl shadow-ink-900/10 [animation-delay:1.2s]">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-400">Filter</p>
              <p className="mt-0.5 font-display text-sm font-bold text-ink-900">
                None <span className="text-flash-500">✕</span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.7, ease: EASE }}
            className="absolute -bottom-5 left-1/2 -translate-x-1/2"
          >
            <div className="animate-float-slow flex items-center gap-3 rounded-full bg-ink-900 py-2.5 pl-3 pr-6 text-cream-50 shadow-2xl shadow-ink-900/40">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flash-500">
                <Zap className="h-4 w-4 fill-current" />
              </span>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-cream-100/60">
                  Price starts from:
                </p>
                <p className="font-display text-lg font-bold leading-none">₱4,599</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
