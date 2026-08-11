import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, MessageCircle, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Reveal } from "./Reveal";

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;

export default function CTA() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim() || submitting) return;

    if (!FORMSPREE_ENDPOINT) {
      console.error("VITE_FORMSPREE_ENDPOINT is not set — see .env.example");
      setError("Messages aren't wired up yet — DM us on Instagram instead.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          _subject: "New message from digimarketph.com",
          _replyto: email,
          email,
          message,
        }),
      });
      if (!res.ok) throw new Error("request_failed");
      setDone(true);
    } catch {
      setError("Couldn't send that — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="cta" className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <Reveal className="mx-auto max-w-6xl">
        <div className="grain relative overflow-hidden rounded-[2.5rem] bg-ink-900 px-6 py-16 text-center shadow-[0_60px_120px_-40px_rgba(27,23,18,0.6)] sm:px-12 lg:px-20 lg:py-24">
          {/* Ambient — radial-gradients, not filter:blur, since Safari doesn't reliably
              clip a blurred child to a rounded overflow-hidden parent. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(500px_circle_at_50%_-10%,rgba(255,77,0,0.28),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(320px_circle_at_0%_110%,rgba(18,185,129,0.16),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(320px_circle_at_100%_110%,rgba(255,106,43,0.16),transparent_70%)]" />
          </div>

          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cream-50/15 bg-cream-50/5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-flash-400 backdrop-blur">
              <MessageCircle className="h-3.5 w-3.5" />
              Got a question?
            </span>

            <h2 className="mt-6 font-display text-4xl font-bold tracking-tight text-cream-50 sm:text-6xl">
              We'd love to
              <br />
              <span className="bg-gradient-to-r from-flash-400 via-flash-300 to-flash-400 bg-clip-text text-transparent">
                hear from you.
              </span>
            </h2>

            {/* Contact form */}
            <div className="mx-auto mt-9 max-w-lg">
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                    className="flex items-center justify-center gap-3 rounded-full border border-lcd-400/30 bg-lcd-500/15 px-6 py-4 font-semibold text-lcd-400"
                    role="status"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lcd-500 text-ink-900">
                      <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                    </span>
                    Message sent! We'll get back to you soon.
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={onSubmit}
                    className="flex flex-col gap-3"
                  >
                    <label htmlFor="cta-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="cta-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full rounded-full border border-cream-50/15 bg-cream-50/8 px-6 py-4 text-sm text-cream-50 placeholder:text-cream-100/35 backdrop-blur transition-colors duration-300 focus:border-flash-400/60 focus:outline-none"
                    />
                    <label htmlFor="cta-message" className="sr-only">
                      Your message
                    </label>
                    <textarea
                      id="cta-message"
                      required
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask us anything — sizing, availability, anything at all."
                      className="w-full resize-none rounded-3xl border border-cream-50/15 bg-cream-50/8 px-6 py-4 text-sm text-cream-50 placeholder:text-cream-100/35 backdrop-blur transition-colors duration-300 focus:border-flash-400/60 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-shine group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-flash-500 px-7 py-4 text-sm font-semibold text-cream-50 shadow-xl shadow-flash-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:bg-flash-600 disabled:pointer-events-none disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {submitting ? "Sending…" : "Send message"}
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
              {error && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-flash-400">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
              )}
              <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream-100/35">
                We'll reply as soon as we can.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}