import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { MARQUEE_WORDS, PRESS, STATS } from "../lib/data";
import { Reveal } from "./Reveal";

function CountUp({
  value,
  suffix,
  decimals = 0,
}: {
  value: number;
  suffix: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) {
      ref.current.textContent = value.toLocaleString("en-PH", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return;
    }
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = v.toLocaleString("en-PH", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
        }
      },
    });
    return () => controls.stop();
  }, [inView, value, decimals, reduce]);

  return (
    <span className="tabular-nums">
      <span ref={ref}>0</span>
      <span className="text-flash-500">{suffix}</span>
    </span>
  );
}

export default function SocialProof() {
  return (
    <section aria-label="Social proof" className="relative">
      {/* Press marquee */}
      <div className="border-y border-ink-900/8 bg-cream-50/60 py-5">
        <Reveal>
          <p className="mb-4 text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ink-400">
            Hyped on your FYP · featured in
          </p>
        </Reveal>
        <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-14 pr-14 group-hover:[animation-play-state:paused]">
            {[...PRESS, ...PRESS].map((press, i) => (
              <span
                key={i}
                className="whitespace-nowrap font-display text-lg font-bold tracking-tight text-ink-300 transition-colors duration-300 hover:text-ink-900"
              >
                {press}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.08}>
              <div className="group relative flex flex-col text-center lg:text-left">
                <dt className="order-2 mt-2 text-xs font-medium leading-relaxed text-ink-400 sm:text-sm">
                  {stat.label}
                </dt>
                <dd className="order-1 font-display text-4xl font-bold tracking-tight text-ink-900 transition-colors duration-300 group-hover:text-flash-500 sm:text-5xl">
                  <CountUp value={stat.value} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
                </dd>
                <span
                  aria-hidden="true"
                  className="mx-auto mt-4 block h-px w-10 bg-ink-900/15 transition-all duration-500 group-hover:w-16 group-hover:bg-flash-500 lg:mx-0"
                />
              </div>
            </Reveal>
          ))}
        </dl>
      </div>

      {/* Word marquee band */}
      <div className="relative overflow-hidden bg-ink-900 py-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,77,0,0.16),transparent_60%)]"
        />
        <div className="flex w-max animate-marquee-slow gap-10 pr-10">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
            <span
              key={i}
              className="flex items-center gap-10 whitespace-nowrap font-display text-4xl font-bold uppercase tracking-tight text-cream-100/90 sm:text-5xl"
            >
              {word}
              <span className="text-flash-500">✳</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
