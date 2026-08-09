import { Star } from "lucide-react";
import { CUSTOMER_REVIEWS, CUSTOMER_TAGS } from "../lib/data";
import { Eyebrow, Reveal } from "./Reveal";

function Stars() {
  return (
    <div className="flex gap-1" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-flash-500 text-flash-500" />
      ))}
    </div>
  );
}

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

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CUSTOMER_REVIEWS.map((r, i) => (
            <Reveal key={r.handle} delay={Math.min(i, 6) * 0.06}>
              <figure className="group flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-ink-900/8 bg-cream-50 p-7 shadow-[0_2px_20px_-8px_rgba(27,23,18,0.12)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_26px_55px_-22px_rgba(27,23,18,0.28)]">
                <div>
                  <Stars />
                  <blockquote className="mt-4 text-sm leading-relaxed text-ink-600">“{r.quote}”</blockquote>
                </div>
                <figcaption className="mt-7 flex items-center gap-3.5">
                  <img
                    src={r.avatar}
                    alt=""
                    aria-hidden="true"
                    className="h-11 w-11 shrink-0 rounded-full object-cover shadow-lg ring-2 ring-cream-50/20 transition-transform duration-500 group-hover:scale-110"
                  />
                  <p className="font-semibold text-ink-900">{r.handle}</p>
                  <span className="ml-auto font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-lcd-500">
                    ✓ verified
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
