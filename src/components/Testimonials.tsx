import { Star } from "lucide-react";
import { CUSTOMER_TAGS, TESTIMONIALS } from "../lib/data";
import { Eyebrow, Reveal, Stagger, StaggerItem } from "./Reveal";

function CustomerTagsMarquee() {
  return (
    <div className="mt-10">
      <Reveal delay={0.14}>
        <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ink-400">
          Tagged by real buyers on Instagram
        </p>
      </Reveal>
      <div className="group relative mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-marquee gap-4 pr-4 group-hover:[animation-play-state:paused]">
          {[...CUSTOMER_TAGS, ...CUSTOMER_TAGS].map((tag, i) => (
            <div
              key={i}
              className="relative h-44 w-32 shrink-0 overflow-hidden rounded-2xl bg-ink-900/5 sm:h-52 sm:w-40"
            >
              <img
                src={tag.image}
                alt={`Camera tagged by ${tag.handle} on Instagram`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/85 via-ink-900/10 to-transparent px-2.5 pb-2 pt-8">
                <p className="truncate font-mono text-[10px] font-bold text-cream-50">{tag.handle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stars() {
  return (
    <div className="flex gap-1" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-flash-500 text-flash-500" />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="reviews" className="relative overflow-hidden py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-flash-300/12 blur-[130px]"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow>Proof, not promises</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Countless customer reviews.
              <br />
              <span className="text-flash-500">Zero filters used.</span>
            </h2>
          </Reveal>
        </div>

        <CustomerTagsMarquee />

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" amount={0.1}>
          {TESTIMONIALS.map((t, i) => {
            const isWide = i === TESTIMONIALS.length - 1;
            return (
            <StaggerItem
              key={t.name}
              className={
                t.featured
                  ? "sm:col-span-2 lg:col-span-1 lg:row-span-2"
                  : isWide
                    ? "sm:col-span-2 lg:col-span-3"
                    : ""
              }
            >
              <figure
                className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-ink-900/8 bg-cream-50 p-7 shadow-[0_2px_20px_-8px_rgba(27,23,18,0.12)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_26px_55px_-22px_rgba(27,23,18,0.28)] ${
                  t.featured
                    ? "bg-ink-900 text-cream-100 sm:p-9"
                    : isWide
                      ? "lg:flex-row lg:items-center lg:gap-10 lg:p-9"
                      : ""
                }`}
              >
                <div className={isWide ? "lg:flex-1" : ""}>
                  {t.featured && (
                    <span className="mb-5 inline-block rounded-full bg-flash-500/15 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-flash-400">
                      ★ Featured review
                    </span>
                  )}
                  <Stars />
                  <blockquote
                    className={`mt-4 leading-relaxed ${
                      t.featured
                        ? "font-display text-xl font-medium tracking-tight sm:text-2xl"
                        : isWide
                          ? "text-base text-ink-600 sm:text-lg"
                          : "text-sm text-ink-600"
                    }`}
                  >
                    “{t.quote}”
                  </blockquote>
                </div>
                <figcaption className="mt-7 flex items-center gap-3.5 lg:mt-0 lg:shrink-0">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} font-display text-sm font-bold text-cream-50 shadow-lg ring-2 ring-cream-50/20 transition-transform duration-500 group-hover:scale-110`}
                    aria-hidden="true"
                  >
                    {t.initials}
                  </span>
                  <div>
                    <p className={`font-semibold ${t.featured ? "text-cream-50" : "text-ink-900"}`}>
                      {t.name}
                    </p>
                    <p
                      className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${
                        t.featured ? "text-cream-100/50" : "text-ink-400"
                      }`}
                    >
                      {t.meta}
                    </p>
                  </div>
                  <span
                    className={`ml-auto font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${
                      t.featured ? "text-lcd-400" : "text-lcd-500"
                    }`}
                  >
                    ✓ verified
                  </span>
                </figcaption>
              </figure>
            </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
