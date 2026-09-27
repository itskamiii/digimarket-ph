import { Wrench } from "lucide-react";
import logoText from "../assets/logo-text.png";
import { Reveal } from "./Reveal";

// lucide-react dropped brand icons a while back — same inline Instagram glyph Footer.tsx uses.
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

// Full-page stand-in for the whole site while MAINTENANCE_MODE is on (see
// src/lib/maintenance.ts) — deliberately doesn't touch useProducts/Supabase at all, so
// it renders correctly no matter what state the backend is in.
export default function Maintenance() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-16 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_50%_-10%,rgba(255,77,0,0.22),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(360px_circle_at_0%_110%,rgba(18,185,129,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(360px_circle_at_100%_110%,rgba(255,106,43,0.14),transparent_70%)]" />
      </div>

      <Reveal className="relative mx-auto flex max-w-xl flex-col items-center">
        {/* Just the pixel-art wordmark, cropped out of logo.png with its cream circle
            and white backing removed — inverted white-on-transparent so it reads
            against this dark background, and left to float free with no badge/circle
            around it. */}
        <img
          src={logoText}
          alt="Digimarket — by Tomi & Kami"
          className="w-64 invert animate-float-slow drop-shadow-[0_8px_30px_rgba(255,77,0,0.35)] sm:w-80"
        />

        <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-cream-50/15 bg-cream-50/5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-flash-400 backdrop-blur">
          <Wrench className="h-3.5 w-3.5" />
          Quick maintenance in progress
        </span>

        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-cream-50 sm:text-5xl">
          One sec, we're
          <br />
          <span className="bg-gradient-to-r from-flash-400 via-flash-300 to-flash-400 bg-clip-text text-transparent">
            fixing some stuff.
          </span>
        </h1>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-cream-100/60 sm:text-base">
          Our site's undergoing a quick technical fix and will be back soon. Our
          cameras are still very much available in the meantime — DM us on Instagram
          and we'll sort you out the old-school way.
        </p>

        <a
          href="https://instagram.com/digimarket_ph"
          target="_blank"
          rel="noreferrer"
          className="btn-shine group mt-9 inline-flex items-center justify-center gap-2.5 rounded-full bg-flash-500 px-8 py-4 text-base font-semibold text-cream-50 shadow-xl shadow-flash-500/35 transition-all duration-300 hover:-translate-y-0.5 hover:bg-flash-600 hover:shadow-2xl hover:shadow-flash-500/45"
        >
          <InstagramIcon className="h-4.5 w-4.5" />
          DM us on Instagram
        </a>

        <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream-100/35">
          @digimarket_ph · vintage cameras for the Y2K generation
        </p>
      </Reveal>
    </div>
  );
}
