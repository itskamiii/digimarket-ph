import logo from "../assets/logo.png";
import { FOOTER_LINKS } from "../lib/data";

type IconProps = { className?: string };

const InstagramIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);

// Instagram is the only real platform the business uses — no Facebook or TikTok.
const SOCIALS = [{ label: "Instagram", icon: InstagramIcon, href: "https://instagram.com/digimarket_ph" }];

const PAYMENTS = ["QRPh", "COD"];

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
              <img src={logo} alt="" className="h-10 w-10 rounded-full shadow-lg shadow-flash-500/30" width={40} height={40} />
              <span className="font-display text-xl font-bold tracking-tight">
                digimarket<span className="text-flash-400">_ph</span>
              </span>
            </a>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream-100/50">
              Vintage digital cameras for the Y2K generation. Hunted down and
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
            <a
              href="#faq"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream-100/35 transition-colors duration-300 hover:text-flash-400"
            >
              Policies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
