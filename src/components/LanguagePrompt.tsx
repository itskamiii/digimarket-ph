import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Globe, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LANGUAGES, hasBeenAsked, saveNativeLanguage } from "../lib/languages";
import { EASE } from "./Reveal";

// First-load greeting for international buyers: we ship worldwide via DHL, but everything
// on the site is written in English, so this asks up front what language they actually
// speak. The answer rides along with their order/subscription (see Checkout.tsx and
// CTA.tsx) purely so the owner knows what language to reply in over DM or email — it
// never changes what's rendered, so nothing here gates the site.
export default function LanguagePrompt() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");

  // Deferred to an effect (not useState's initializer) so the first render matches for
  // everyone and localStorage is only ever touched in the browser.
  useEffect(() => {
    if (!hasBeenAsked()) setOpen(true);
  }, []);

  const dismiss = (label: string | null) => {
    saveNativeLanguage(label);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        // Backdrop and centering container in one. Deliberately NOT `grain` and never
        // given a transform: `grain` is a custom utility that sets `position: relative`
        // and lands *after* `.fixed` in the generated CSS, so putting it on a positioned
        // element silently wins the cascade and drops the panel back into normal flow
        // (it renders below the whole page, invisible). Flexbox centering also keeps
        // Framer Motion's inline `transform` from clobbering a `-translate-y-1/2` class.
        <motion.div
          key="lang-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => dismiss(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink-950/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, scale: 0.97 }}
            transition={{ duration: 0.4, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lang-heading"
            className="w-full max-w-md"
          >
            <div className="grain relative overflow-hidden rounded-[2rem] bg-ink-900 px-6 py-9 text-center shadow-[0_60px_120px_-40px_rgba(27,23,18,0.7)] sm:px-10">
              {/* Ambient — radial-gradients, not filter:blur, since Safari doesn't reliably
                  clip a blurred child to a rounded overflow-hidden parent. */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(400px_circle_at_50%_-20%,rgba(255,77,0,0.3),transparent_70%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(280px_circle_at_100%_120%,rgba(18,185,129,0.14),transparent_70%)]" />
              </div>

              <button
                type="button"
                onClick={() => dismiss(null)}
                aria-label="Close"
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-cream-100/40 transition-colors hover:bg-cream-50/10 hover:text-cream-50"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-cream-50/15 bg-cream-50/5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-flash-400 backdrop-blur">
                  <Globe className="h-3.5 w-3.5" />
                  We ship worldwide
                </span>

                <h2
                  id="lang-heading"
                  className="mt-5 font-display text-3xl font-bold tracking-tight text-cream-50 sm:text-4xl"
                >
                  What's your
                  <br />
                  <span className="bg-gradient-to-r from-flash-400 via-flash-300 to-flash-400 bg-clip-text text-transparent">
                    native language?
                  </span>
                </h2>

                <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-cream-100/60">
                  The site's in English, but we're not. Tell us and we'll reply in your
                  language when you message us.
                </p>

                <div className="relative mt-7">
                  <label htmlFor="native-language" className="sr-only">
                    Your native language
                  </label>
                  <select
                    id="native-language"
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                    className="w-full appearance-none rounded-full border border-cream-50/15 bg-cream-50/8 px-6 py-4 text-center text-sm text-cream-50 backdrop-blur transition-colors duration-300 focus:border-flash-400/60 focus:outline-none"
                  >
                    <option value="" className="bg-ink-900 text-cream-50">
                      Choose your language…
                    </option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang.label} value={lang.label} className="bg-ink-900 text-cream-50">
                        {lang.native === lang.label ? lang.native : `${lang.native} — ${lang.label}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-100/40"
                  />
                </div>

                <button
                  type="button"
                  disabled={!choice}
                  onClick={() => dismiss(choice)}
                  className="btn-shine mt-3 w-full rounded-full bg-flash-500 px-7 py-4 text-sm font-semibold text-cream-50 shadow-xl shadow-flash-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:bg-flash-600 disabled:pointer-events-none disabled:opacity-40"
                >
                  Let's go
                </button>

                <button
                  type="button"
                  onClick={() => dismiss(null)}
                  className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream-100/35 underline decoration-dotted underline-offset-4 transition-colors hover:text-cream-100/60"
                >
                  I'll browse in English
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}