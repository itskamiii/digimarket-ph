import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Plus } from "lucide-react";
import { useState } from "react";
import { FAQS } from "../lib/data";
import { EASE, Eyebrow, Reveal } from "./Reveal";

function FaqItem({
  q,
  a,
  open,
  onToggle,
  index,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border transition-all duration-500 ${
        open
          ? "border-ink-900/15 bg-cream-50 shadow-[0_20px_45px_-20px_rgba(27,23,18,0.25)]"
          : "border-ink-900/8 bg-cream-50/60 hover:border-ink-900/15 hover:bg-cream-50"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`faq-panel-${index}`}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left sm:px-7"
      >
        <span className="flex items-center gap-4">
          <span className="hidden font-mono text-[11px] font-bold text-ink-300 sm:block">
            0{index + 1}
          </span>
          <span className="font-display text-base font-bold tracking-tight text-ink-900 sm:text-lg">
            {q}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
            open ? "bg-flash-500 text-cream-50" : "bg-ink-900/8 text-ink-700"
          }`}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`faq-panel-${index}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <p className="px-6 pb-6 pl-[4.5rem] text-sm leading-relaxed text-ink-500 sm:px-7 sm:pl-[4.75rem]">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="faq" className="relative overflow-hidden py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-flash-300/12 blur-[120px]"
      />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-8">
        <div>
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Questions?
              <br />
              <span className="text-flash-500">Sabi na nga ba.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-500">
              Everything you're wondering before you cop — condition, shipping, payment, and our
              policies.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-8 rounded-3xl border border-ink-900/8 bg-cream-50/80 p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-flash-500/12 text-flash-500">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-base font-bold text-ink-900">
                    Still curious?
                  </p>
                  <p className="text-sm text-ink-400">
                    DM us on Instagram — we reply in minutes.
                  </p>
                </div>
              </div>
              <a
                href="https://instagram.com/digimarket_ph"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-5 py-3.5 text-sm font-semibold text-cream-50 transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink-800"
              >
                @digimarket_ph
              </a>
            </div>
          </Reveal>
        </div>

        <div className="space-y-3.5">
          {FAQS.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 0.06}>
              <FaqItem
                q={faq.q}
                a={faq.a}
                index={i}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
