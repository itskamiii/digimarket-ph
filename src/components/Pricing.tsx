import { Check, CreditCard, ShoppingBag } from "lucide-react";
import kitFlatlay from "../assets/kit-flatlay.jpg";
import { useCart } from "../context/CartContext";
import { useProducts } from "../hooks/useProducts";
import { PLANS } from "../lib/data";
import { formatPeso as peso } from "../lib/format";
import { Eyebrow, Reveal } from "./Reveal";

export default function Pricing() {
  const { addItem, openCart } = useCart();
  const products = useProducts();

  // Marketing copy (tagline/features) stays static; price comes from Supabase once
  // loaded, and a plan disappears here if the owner deactivates its kit there.
  const liveKits = products.status === "ready" ? products.data.kits : null;
  const plans = PLANS.filter((p) => !liveKits || liveKits.some((k) => k.id === p.id)).map((p) => {
    const live = liveKits?.find((k) => k.id === p.id);
    return live ? { ...p, price: live.price } : p;
  });

  return (
    <section id="kits" className="relative overflow-hidden py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-24 h-[460px] w-[460px] rounded-full bg-lcd-400/10 blur-[130px]"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header + flatlay */}
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <Reveal>
              <Eyebrow>Kits & bundles</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
                Pick your era.
                <br />
                <span className="text-flash-500">We'll handle the rest.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-500 sm:text-lg">
                Every kit ships complete — camera, strap, SD card, reader, and a mini guide —
                so you're posting flash photos the night it arrives.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.2} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-[2.5rem] bg-flash-400/15 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-ink-900/10 bg-cream-50 shadow-[0_30px_70px_-30px_rgba(27,23,18,0.4)]">
              <img
                src={kitFlatlay}
                alt="Y2K Starter kit contents: vintage digicam, strap, SD card, reader, and tripod on a cream background"
                loading="lazy"
                width={880}
                height={700}
                className="aspect-[4/3.2] w-full object-cover"
              />
              <div className="glass absolute inset-x-4 bottom-4 rounded-2xl px-4 py-3 shadow-lg">
                <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-700">
                  What's in the box — the full Y2K Starter
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Plans */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.1} className="h-full">
              <article
                className={`relative flex h-full flex-col rounded-[2rem] p-8 transition-all duration-500 hover:-translate-y-2 ${
                  plan.popular
                    ? "grain bg-ink-900 text-cream-100 shadow-[0_40px_80px_-30px_rgba(27,23,18,0.55)] lg:scale-[1.04]"
                    : "border border-ink-900/8 bg-cream-50 shadow-[0_2px_20px_-8px_rgba(27,23,18,0.12)] hover:shadow-[0_30px_60px_-25px_rgba(27,23,18,0.3)]"
                }`}
              >
                {plan.popular && (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(ellipse_at_top,rgba(255,77,0,0.22),transparent_55%)]"
                    />
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-flash-500 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream-50 shadow-lg shadow-flash-500/40">
                      ★ Most popular
                    </span>
                  </>
                )}

                <div className="relative">
                  <h3
                    className={`font-display text-xl font-bold tracking-tight ${
                      plan.popular ? "text-cream-50" : "text-ink-900"
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`mt-1.5 text-sm ${
                      plan.popular ? "text-cream-100/55" : "text-ink-400"
                    }`}
                  >
                    {plan.tagline}
                  </p>

                  <div className="mt-6 flex items-end gap-2">
                    <p
                      className={`font-display text-5xl font-bold tracking-tight ${
                        plan.popular ? "text-cream-50" : "text-ink-900"
                      }`}
                    >
                      {peso(plan.price)}
                    </p>
                    <span
                      className={`pb-1.5 text-sm font-medium ${
                        plan.popular ? "text-cream-100/50" : "text-ink-400"
                      }`}
                    >
                      one-time
                    </span>
                  </div>

                  <ul className="mt-7 space-y-3.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            plan.popular
                              ? "bg-flash-500/20 text-flash-400"
                              : "bg-lcd-500/15 text-lcd-500"
                          }`}
                        >
                          <Check className="h-3 w-3" strokeWidth={3.5} />
                        </span>
                        <span
                          className={`text-sm leading-relaxed ${
                            plan.popular ? "text-cream-100/80" : "text-ink-600"
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addItem({ type: "kit", id: plan.id, name: plan.name, price: plan.price });
                    openCart();
                  }}
                  className={`btn-shine group relative mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                    plan.popular
                      ? "bg-flash-500 text-cream-50 shadow-xl shadow-flash-500/35 hover:bg-flash-600"
                      : "bg-ink-900 text-cream-50 shadow-lg shadow-ink-900/25 hover:bg-ink-800"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
                  {plan.cta}
                </button>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Payment reassurance */}
        <Reveal delay={0.15}>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {["GCash", "Maya", "Visa", "Mastercard", "COD Metro Manila"].map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-ink-900/10 bg-cream-50 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500 transition-colors duration-300 hover:border-flash-500/40 hover:text-ink-900"
                >
                  {p}
                </span>
              ))}
            </div>
            <p className="flex items-center gap-2 text-xs text-ink-400">
              <CreditCard className="h-3.5 w-3.5" />
              Full disclosure + video proof before every unit ships
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
