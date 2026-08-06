import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useProducts } from "../hooks/useProducts";
import type { Availability, CatalogItem } from "../lib/data";
import { formatPeso } from "../lib/format";
import { Eyebrow, Reveal, Stagger, StaggerItem } from "./Reveal";

function StatusPill({ availability }: { availability: Availability }) {
  if (availability === "sold") {
    return (
      <span className="rounded-full bg-ink-900/8 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
        Sold
      </span>
    );
  }
  if (availability === "reserved") {
    return (
      <span className="rounded-full bg-flash-500/12 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-flash-500">
        Reserved
      </span>
    );
  }
  return null;
}

function CatalogRow({ item }: { item: CatalogItem }) {
  const { addItem, isInCart } = useCart();
  const isAvailable = item.availability === "available";
  const inBag = isInCart("unit", item.id);

  return (
    <li
      className={`flex items-center justify-between gap-4 border-b border-ink-900/8 py-3.5 last:border-b-0 ${
        !isAvailable ? "opacity-60" : ""
      }`}
    >
      <span className="text-sm font-medium text-ink-900 sm:text-base">{item.name}</span>
      <span className="flex shrink-0 items-center gap-3">
        <StatusPill availability={item.availability} />
        {isAvailable && (
          <>
            <span className="font-display text-sm font-bold text-ink-900 sm:text-base">{formatPeso(item.price)}</span>
            <button
              type="button"
              onClick={() =>
                !inBag && addItem({ type: "unit", id: item.id, name: item.name, price: item.price })
              }
              disabled={inBag}
              aria-label={inBag ? `${item.name} is in your bag` : `Add ${item.name} to bag`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                inBag
                  ? "bg-lcd-500/15 text-lcd-500"
                  : "bg-ink-900/8 text-ink-700 hover:bg-flash-500 hover:text-cream-50"
              }`}
            >
              {inBag ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              )}
            </button>
          </>
        )}
      </span>
    </li>
  );
}

export default function Catalog() {
  const products = useProducts();
  const [active, setActive] = useState<string>("camcorders");

  const digicamsByBrand = products.status === "ready" ? products.data.digicamsByBrand : [];
  const camcorders = products.status === "ready" ? products.data.camcorders : [];
  const tabs = ["camcorders", ...digicamsByBrand.map((g) => g.brand)];

  const activeItems: CatalogItem[] =
    active === "camcorders" ? camcorders : digicamsByBrand.find((g) => g.brand === active)?.items ?? [];

  return (
    <section id="catalog" className="relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl">
          <Reveal>
            <Eyebrow>Full catalog</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Every unit we've got.
            </h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              Shipping fee is cash on delivery, shouldered by the buyer. Details for each unit
              are in the caption of its product post — visit our profile for photos.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.18} className="mt-10 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={`rounded-full px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-300 ${
                active === tab
                  ? "bg-ink-900 text-cream-50"
                  : "bg-ink-900/6 text-ink-500 hover:bg-ink-900/12"
              }`}
            >
              {tab === "camcorders" ? "Camcorders" : tab}
            </button>
          ))}
        </Reveal>

        {products.status === "loading" && (
          <p className="mt-10 text-center text-sm text-ink-400">Loading the catalog…</p>
        )}
        {products.status === "error" && (
          <p className="mt-10 text-center text-sm text-flash-600">{products.message}</p>
        )}
        {products.status === "ready" && (
          <Stagger className="mt-8" amount={0.05}>
            <StaggerItem>
              <ul className="rounded-[1.5rem] border border-ink-900/8 bg-cream-50 px-5 py-2 sm:px-8">
                {activeItems.map((item) => (
                  <CatalogRow key={item.id} item={item} />
                ))}
              </ul>
            </StaggerItem>
          </Stagger>
        )}
      </div>
    </section>
  );
}
