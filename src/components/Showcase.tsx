import type { ProductsState } from "../hooks/useProducts";
import { CatalogList } from "./Catalog";
import { Eyebrow, Reveal } from "./Reveal";

export default function Showcase({ products }: { products: ProductsState }) {
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
              <Eyebrow>Available units</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
                Each camera's one of a kind.
                <br />
                <span className="text-flash-500">When it's gone, it's gone.</span>
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

        <CatalogList products={products} />

        <Reveal delay={0.1} className="mt-12 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-ink-400">
            Unit shown may vary slightly — that's the beauty of vintage
          </p>
        </Reveal>
      </div>
    </section>
  );
}
