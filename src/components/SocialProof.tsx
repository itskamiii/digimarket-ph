import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { HASHTAGS, STATS } from "../lib/data";
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
      {/* Hashtag marquee */}
      <div className="border-y border-ink-900/8 bg-cream-50/60 py-5">
        <Reveal>
          <p className="mb-4 text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ink-400">
            Hyped on your FYP · tag us with
          </p>
        </Reveal>
        <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-14 pr-14 group-hover:[animation-play-state:paused]">
            {[...HASHTAGS, ...HASHTAGS].map((tag, i) => (
              <span
                key={i}
                className="whitespace-nowrap font-display text-lg font-bold tracking-tight text-ink-300 transition-colors duration-300 hover:text-ink-900"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grain relative overflow-hidden rounded-[2rem] bg-ink-900 px-6 py-12 sm:px-10 lg:py-16">
          <dl className="relative grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-3">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.08}>
                <div className="group relative flex flex-col text-center">
                  <dt className="order-2 mt-2 text-xs font-medium leading-relaxed text-cream-100/55 sm:text-sm">
                    {stat.label}
                  </dt>
                  <dd className="order-1 font-display text-4xl font-bold tracking-tight text-cream-50 transition-colors duration-300 group-hover:text-flash-400 sm:text-5xl">
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </dd>
                  <span
                    aria-hidden="true"
                    className="mx-auto mt-4 block h-px w-10 bg-cream-50/15 transition-all duration-500 group-hover:w-16 group-hover:bg-flash-500"
                  />
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
