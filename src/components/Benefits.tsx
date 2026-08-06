import { BENEFITS } from "../lib/data";
import { Eyebrow, Reveal, Stagger, StaggerItem } from "./Reveal";

export default function Benefits() {
  return (
    <section className="grain relative overflow-hidden bg-ink-900 py-20 text-cream-100 lg:py-28">
      {/* Ambient glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-[420px] w-[560px] rounded-full bg-flash-500/15 blur-[130px]" />
        <div className="absolute bottom-0 -left-24 h-96 w-96 rounded-full bg-lcd-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(251,248,241,0.05)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        {/* Visual collage */}
        <Reveal className="relative order-2 lg:order-1">
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[3rem] bg-gradient-to-tr from-flash-500/25 to-lcd-500/15 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-cream-50/10 shadow-2xl shadow-black/50">
              <img
                src="https://images.pexels.com/photos/2744982/pexels-photo-2744982.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1000&w=800"
                alt="Gen-Z woman holding a vintage digital camera"
                loading="lazy"
                width={800}
                height={1000}
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-transparent to-transparent" />
              <p className="absolute bottom-5 left-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cream-100/80">
                Shot on Digimarket_PH · no filter
              </p>
            </div>

            {/* Floating LCD chip */}
            <div className="absolute -right-3 -top-6 animate-float rounded-2xl border border-cream-50/15 bg-ink-800/80 p-4 shadow-2xl backdrop-blur-xl sm:-right-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lcd-500/20 font-mono text-lg text-lcd-400">
                  ✓
                </span>
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-cream-100/50">
                    Authentic CCD
                  </p>
                  <p className="font-display text-sm font-bold">Verified grain ✓</p>
                </div>
              </div>
            </div>

            {/* Floating flatlay card */}
            <div className="absolute -bottom-10 -left-3 w-44 animate-float-slow overflow-hidden rounded-2xl border border-cream-50/15 shadow-2xl sm:-left-8 sm:w-56">
              <img
                src="https://images.pexels.com/photos/30640575/pexels-photo-30640575.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=500&w=400"
                alt="Friends posing for a flash photo at night"
                loading="lazy"
                width={400}
                height={500}
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="glass-dark absolute inset-0 flex items-end p-3">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cream-100">
                  Flash ON · 11:47 PM
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <Reveal>
            <Eyebrow>
              <span className="text-flash-400">The digimarket difference</span>
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-cream-50 sm:text-5xl">
              Everyone's posting the same feed.
              <br />
              <span className="bg-gradient-to-r from-flash-400 to-flash-300 bg-clip-text text-transparent">
                Yours won't be.
              </span>
            </h2>
          </Reveal>

          <Stagger className="mt-10 space-y-2" amount={0.15}>
            {BENEFITS.map((benefit) => (
              <StaggerItem key={benefit.num}>
                <div className="group flex gap-5 rounded-3xl p-5 transition-all duration-500 hover:bg-cream-50/5 sm:gap-7 sm:p-6">
                  <span className="font-mono text-sm font-bold text-flash-500/80 transition-all duration-500 group-hover:text-flash-400">
                    {benefit.num}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold tracking-tight text-cream-50 sm:text-xl">
                      {benefit.title}
                    </h3>
                    <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-cream-100/55 transition-colors duration-500 group-hover:text-cream-100/75">
                      {benefit.body}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
