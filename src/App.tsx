import Benefits from "./components/Benefits";
import Catalog from "./components/Catalog";
import CTA from "./components/CTA";
import FAQ from "./components/FAQ";
import Features from "./components/Features";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import Pricing from "./components/Pricing";
import Showcase from "./components/Showcase";
import SocialProof from "./components/SocialProof";
import Testimonials from "./components/Testimonials";

export default function App() {
  return (
    <div className="min-h-screen overflow-x-clip bg-cream-100">
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink-900 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-cream-50"
      >
        Skip to content
      </a>
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <Showcase />
        <Catalog />
        <Benefits />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
