import { Camera } from "lucide-react";
import { FOOTER_LINKS } from "../lib/data";

type IconProps = { className?: string };

const InstagramIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);

const TikTokIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const XIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// TODO(owner): only Instagram is a confirmed real handle so far. Swap the remaining
// "#top" placeholders for real profile URLs once you share them, or drop the icon.
const SOCIALS = [
  { label: "Instagram", icon: InstagramIcon, href: "https://instagram.com/digimarket_ph" },
  { label: "TikTok", icon: TikTokIcon, href: "#top" },
  { label: "Twitter / X", icon: XIcon, href: "#top" },
  { label: "Facebook", icon: FacebookIcon, href: "#top" },
];

const PAYMENTS = ["GCash", "Maya", "Visa", "MC", "COD"];

export default function Footer() {
  return (
    <footer className="grain relative overflow-hidden bg-ink-950 text-cream-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flash-500/60 to-transparent"
      />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          {/* Brand */}
          <div>
            <a href="#top" className="flex items-center gap-2.5" aria-label="Digimarket_PH home">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-flash-500 text-cream-50 shadow-lg shadow-flash-500/30">
                <Camera className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="font-display text-xl font-bold tracking-tight">
                digimarket<span className="text-flash-400">_ph</span>
              </span>
            </a>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream-100/50">
              Vintage digital cameras for the Y2K generation. Hunted, restored, and
              tested in Manila — shipped to your era, nationwide.
            </p>
            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-cream-50/12 text-cream-100/60 transition-all duration-300 hover:-translate-y-1 hover:border-flash-400/50 hover:bg-flash-500/10 hover:text-flash-400"
                >
                  <social.icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {PAYMENTS.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-cream-50/10 px-3.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-cream-100/45"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {Object.entries(FOOTER_LINKS).map(([group, links]) => (
              <div key={group}>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-cream-100/40">
                  {group}
                </h3>
                <ul className="mt-5 space-y-3.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="group relative inline-flex items-center text-sm text-cream-100/65 transition-colors duration-300 hover:text-cream-50"
                      >
                        <span className="mr-0 h-px w-0 bg-flash-400 transition-all duration-300 group-hover:mr-2 group-hover:w-3" />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-cream-50/8 pt-8 sm:flex-row">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream-100/35">
            © 2026 Digimarket_PH · Manila, PH · Made with 💿 &amp; flash
          </p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Warranty"].map((l) => (
              <a
                key={l}
                href="#top"
                className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream-100/35 transition-colors duration-300 hover:text-flash-400"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
