export const NAV_LINKS = [
  { label: "The Drop", href: "#drop" },
  { label: "Why Digicam", href: "#why" },
  { label: "Full Catalog", href: "#catalog" },
  { label: "Reviews", href: "#reviews" },
  { label: "Kits", href: "#kits" },
  { label: "FAQ", href: "#faq" },
];

export const MARQUEE_WORDS = [
  "CCD SENSORS",
  "FLASH ON",
  "REAL GRAIN",
  "EST. 2004",
  "POINT & SHOOT",
  "NO FILTERS",
  "Y2K CORE",
  "RESTORED IN MANILA",
  "POCKET-SIZED",
  "LOW-RES LOVE",
];

export const PRESS = [
  "Y2K MAGAZINE",
  "GADGET PH",
  "BACKSPACE PH",
  "MANILA NOSTALGIA",
  "TIKTOK MADE ME BUY IT",
  "SPOT.PH",
];

export const STATS = [
  { value: 200, suffix: "+", label: "cameras shipped nationwide" },
  { value: 40, suffix: "+", label: "cities across the PH delivered" },
  { value: 100, suffix: "%", label: "hand-restored & tested in Manila" },
];

// Camera/CatalogItem inventory (units, camcorders, digicams) now lives in Supabase —
// see supabase/schema.sql and src/lib/api.ts. src/lib/seed-data.ts holds the original
// static content, used only once by scripts/seed.ts to populate the database.
export type Availability = "available" | "sold" | "reserved";

export type Camera = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  badge?: string;
  bestFor?: string;
  availability: Availability;
  image: string;
  tint: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  price: number;
  availability: Availability;
};

export const FEATURES = [
  {
    icon: "aperture",
    title: "Real CCD sensors",
    body: "That warm, grainy, film-like glow is physics, not a preset. A CCD sensor renders light the way 2004 felt — and no app filter comes close.",
  },
  {
    icon: "wrench",
    title: "Hand-restored in Manila",
    body: "Every unit gets fresh batteries, a sensor dust-out, lens cleaning, and a full flash test before it ships. If we wouldn't gift it, we don't sell it.",
  },
  {
    icon: "zap",
    title: "Flash that goes off",
    body: "The legendary point-and-shoot pop-up flash that turns any inuman, rooftop, or jeepney ride into a full photoshoot. Night mode, unlocked.",
  },
  {
    icon: "shield",
    title: "3 days with terms and conditions",
    body: "Shutter clicks are covered. If your unit acts up within 3 days of delivery, we repair or replace it — terms and conditions apply.",
  },
  {
    icon: "sparkles",
    title: "Rare finds, fair prices",
    body: "Curated drops of Canon, Sony, Fujifilm, and Olympus — hunted from ukay-ukays and Japan surplus to garage sales, priced for students.",
  },
];

export const BENEFITS = [
  {
    num: "01",
    title: "Your photos, not a preset",
    body: "Everyone's feed looks the same because everyone uses the same filter. A digicam gives you a look that's yours — unmarked, unpolished, unmistakable.",
  },
  {
    num: "02",
    title: "Instant social currency",
    body: "It's the camera your mutuals will ask about. Pull it out at a party and watch the group chat light up. You're not just taking photos — you're the vibe.",
  },
  {
    num: "03",
    title: "Pocket-size, always with you",
    body: "No bag needed. These slip into your pocket and come out when the moment's right — birthdays, sessions, random Tuesdays that deserve remembering.",
  },
  {
    num: "04",
    title: "A kinder kind of screen time",
    body: "One button, no notifications, no doomscrolling. Just you, your friends, and a tiny camera that makes every moment feel like a memory already.",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "Brought it to a rooftop session and the flash photos came out SO soft and dreamy. My friends thought I edited them. I literally just pressed the button.",
    name: "Mika R.",
    meta: "21 · Manila",
    initials: "MR",
    gradient: "from-flash-500 to-flash-300",
    featured: true,
  },
  {
    quote:
      "Ordered on a Monday, camera was in QC by Tuesday. Unit looks brand new — the seller even included a handwritten note. 10/10, no notes.",
    name: "Kiko S.",
    meta: "22 · Quezon City",
    initials: "KS",
    gradient: "from-ink-800 to-ink-500",
  },
  {
    quote:
      "The CCD grain is EVERYTHING. I've stopped using my iPhone for nights out. My feed has never looked this good and I've never posted this much.",
    name: "Bea L.",
    meta: "23 · Cebu",
    initials: "BL",
    gradient: "from-lcd-500 to-lcd-400",
  },
  {
    quote:
      "As someone na laging nahuhuli sa trends, this one I got early. The Starter kit's zine taught me more about flash photography than 4 years of art school.",
    name: "Paolo D.",
    meta: "24 · Baguio",
    initials: "PD",
    gradient: "from-flash-300 to-flash-100",
  },
  {
    quote:
      "Was skeptical about buying a 20-year-old camera online, but the 6-month warranty sealed it. 3 months in, zero issues. Best 4,990 I've spent.",
    name: "Sam T.",
    meta: "22 · Makati",
    initials: "ST",
    gradient: "from-ink-700 to-ink-900",
  },
  {
    quote:
      "Got the Creator's Kit with my best friend so we could twin at festivals. Two cameras, one era, unlimited core memories. Sulit na sulit!",
    name: "Gela M.",
    meta: "20 · Davao",
    initials: "GM",
    gradient: "from-flash-500 to-lcd-400",
  },
];

export type Plan = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  monthly: number;
  features: string[];
  cta: string;
  popular?: boolean;
};

// Marketing copy (tagline/features/cta) stays static — it doesn't change daily.
// price/monthly here are seed defaults for supabase/schema.sql's `kits` table;
// useProducts() overrides them with the live values from Supabase at runtime,
// so this file is not what customers are actually charged.
export const PLANS: Plan[] = [
  {
    id: "point-shoot",
    name: "Point & Shoot",
    tagline: "Your first digicam. Keep it simple.",
    price: 2990,
    monthly: 997,
    features: [
      "1 hand-restored digicam (your pick from the drop)",
      "Wrist strap + 4GB SD card",
      "USB card reader for instant uploads",
      "30-day warranty",
    ],
    cta: "Start simple",
  },
  {
    id: "starter",
    name: "The Y2K Starter",
    tagline: "The full 2004 experience, out of the box.",
    price: 4990,
    monthly: 1663,
    popular: true,
    features: [
      "Everything in Point & Shoot",
      "Curated camera — our best units only",
      "Retro patterned strap + mini tripod",
      "\u201CShoot Like It's 2004\u201D guide zine",
      "6-month warranty + free shipping",
    ],
    cta: "Get the Starter",
  },
  {
    id: "creator",
    name: "The Creator's Kit",
    tagline: "Two cameras. One for flash, one for daylight.",
    price: 8490,
    monthly: 2830,
    features: [
      "Everything in Y2K Starter",
      "2 cameras — night + daylight specialists",
      "Spare battery + hard-shell case",
      "Early access to every new drop",
      "12-month warranty",
    ],
    cta: "Go full creator",
  },
];

export const FAQS = [
  {
    q: "Are these cameras actually old?",
    a: "Yes — and that's the point. We source authentic 2000s digicams from Japan surplus, ukay-ukays, and private collections. The vintage sensor is what gives your photos that warm, grainy, film-like look that modern phones can't reproduce.",
  },
  {
    q: "What condition do the cameras arrive in?",
    a: "Excellent. Every unit goes through our 14-point restoration: sensor dust-out, lens cleaning, fresh battery, flash test, and full function check. Cosmetic wear (tiny scratches, scuffs) may remain — it's part of the charm, but everything that matters works perfectly.",
  },
  {
    q: "Do they work with modern SD cards?",
    a: "Yep! All our units accept SD cards up to 32GB (we include one in every kit). Photos transfer through the included USB card reader to any laptop or phone — even via OTG adapters.",
  },
  {
    q: "How fast is shipping?",
    a: "Metro Manila: next day. Luzon: 1–3 days. Visayas & Mindanao: 3–5 days. Every order ships with tracking, and we package cameras in bubble-wrap armor. Shipping is free on Y2K Starter and up.",
  },
  {
    q: "What if it arrives broken or acts up later?",
    a: "If it arrives damaged, we replace it within 7 days — no questions. Every camera also carries a 6-month warranty (12 months on Creator's Kit) covering repairs or replacement. Just message us and we'll handle it.",
  },
  {
    q: "Do I need to know photography?",
    a: "Zero experience needed. Digicams are literally point-and-shoot — auto mode handles focus, exposure, and flash. The included zine teaches you the 5 tricks that make photos look intentional (spoiler: it's mostly flash + distance).",
  },
  {
    q: "What payment methods do you accept?",
    a: "GCash, Maya, bank transfer, credit/debit cards, and Cash on Delivery within Metro Manila. We also offer 0% interest 3-month installments on any kit — because your era shouldn't wait for payday.",
  },
];

export const FOOTER_LINKS = {
  Shop: [
    { label: "The Drop", href: "#drop" },
    { label: "Kits & Bundles", href: "#kits" },
    { label: "Accessories", href: "#kits" },
    { label: "Gift Cards", href: "#cta" },
  ],
  Company: [
    { label: "Our Story", href: "#why" },
    { label: "Restoration Process", href: "#why" },
    { label: "Reviews", href: "#reviews" },
    { label: "Careers", href: "#cta" },
  ],
  Support: [
    { label: "FAQ", href: "#faq" },
    { label: "Shipping", href: "#faq" },
    { label: "Warranty", href: "#faq" },
    { label: "Contact Us", href: "#cta" },
  ],
};
