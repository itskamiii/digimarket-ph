import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import { useCart } from "../context/CartContext";
import { getLiveUnitsCount, type ProductsState } from "../hooks/useProducts";
import { NAV_LINKS } from "../lib/data";
import { EASE } from "./Reveal";

export default function Navbar({ products }: { products: ProductsState }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const liveUnitsCount = getLiveUnitsCount(products);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Announcement bar */}
      <div className="bg-ink-900 text-cream-100">
        <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] sm:text-[11px]">
          <span>⚡ New drop live{liveUnitsCount !== null ? ` — ${liveUnitsCount} units only` : ""}</span>
        </p>
      </div>

      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
        aria-label="Main navigation"
        className={`transition-all duration-500 ${
          scrolled
            ? "glass shadow-[0_8px_40px_-12px_rgba(27,23,18,0.18)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <a
            href="#top"
            className="group flex items-center gap-2.5"
            aria-label="Digimarket_PH home"
          >
            <img
              src={logo}
              alt=""
              className="h-9 w-9 rounded-full shadow-lg shadow-ink-900/20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
              width={36}
              height={36}
            />
            <span className="font-display text-lg font-bold tracking-tight text-ink-900">
              digimarket<span className="text-flash-500">_ph</span>
            </span>
          </a>

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="group relative rounded-full px-4 py-2 text-sm font-medium text-ink-700 transition-colors duration-300 hover:text-ink-900"
                >
                  {link.label}
                  <span className="absolute inset-x-4 -bottom-px h-0.5 origin-left scale-x-0 rounded-full bg-flash-500 transition-transform duration-300 group-hover:scale-x-100" />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <a
              href="#drop"
              className="btn-shine group hidden items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-cream-50 shadow-lg shadow-ink-900/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-xl hover:shadow-ink-900/30 sm:inline-flex"
            >
              <ShoppingBag className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
              Shop the drop
            </a>
            <button
              type="button"
              onClick={openCart}
              aria-label={itemCount > 0 ? `Open bag, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Open bag"}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-900/10 bg-cream-50/70 text-ink-900 backdrop-blur transition-colors hover:bg-cream-50"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-flash-500 px-1 font-mono text-[9px] font-bold text-cream-50 ring-2 ring-cream-50">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-900/10 bg-cream-50/70 text-ink-900 backdrop-blur transition-colors hover:bg-cream-50 lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="glass mx-4 mt-2 rounded-3xl p-4 shadow-2xl shadow-ink-900/15 lg:hidden"
          >
            <ul className="flex flex-col">
              {NAV_LINKS.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.35, ease: EASE }}
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-lg font-semibold text-ink-900 transition-colors hover:bg-cream-50"
                  >
                    {link.label}
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-400">
                      0{i + 1}
                    </span>
                  </a>
                </motion.li>
              ))}
            </ul>
            <a
              href="#drop"
              onClick={() => setOpen(false)}
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-ink-900 px-5 py-4 font-semibold text-cream-50 shadow-lg"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop the drop
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
