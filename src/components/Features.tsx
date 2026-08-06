import { Aperture, ShieldCheck, Sparkles, Usb, Wrench, Zap } from "lucide-react";
import { FEATURES } from "../lib/data";
import { Eyebrow, Reveal, Stagger, StaggerItem } from "./Reveal";

const ICONS: Record<string, typeof Aperture> = {
  aperture: Aperture,
  wrench: Wrench,
  zap: Zap,
  usb: Usb,
  shield: ShieldCheck,
  sparkles: Sparkles,
};

export default function Features() {
  return (
    <section id="why" className="relative overflow-hidden py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-flash-300/15 blur-[120px]"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow>Why digicam</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Filters are a copy.
              <br />
              <span className="text-flash-500">This is the original.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 text-base leading-relaxed text-ink-500 sm:text-lg">
              Every camera in our drop is hunted down and tested by hand in Manila — then sent to
              you with everything you need to start shooting the same day.
            </p>
          </Reveal>
        </div>

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16">
          {FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon] ?? Aperture;
            return (
              <StaggerItem key={feature.title}>
                <article className="group relative h-full overflow-hidden rounded-3xl border border-ink-900/8 bg-cream-50/80 p-7 shadow-[0_2px_20px_-8px_rgba(27,23,18,0.12)] backdrop-blur transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-20px_rgba(27,23,18,0.25)]">
                  <div
                    aria-hidden="true"
                    className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-flash-400/10 blur-2xl transition-all duration-500 group-hover:bg-flash-400/25"
                  />
                  <div className="relative">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-cream-50 shadow-lg shadow-ink-900/20 transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-flash-500 group-hover:shadow-flash-500/40">
                      <Icon className="h-5.5 w-5.5" strokeWidth={2} />
                    </span>
                    <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-ink-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-ink-500">
                      {feature.body}
                    </p>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
