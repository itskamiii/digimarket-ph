// Seed-only content — read exclusively by scripts/seed.ts to populate Supabase.
// Not imported by the running app: once seeded, the `units`/`kits` tables in
// Supabase are the runtime source of truth (see src/lib/api.ts / useProducts).
// Edit inventory going forward in Supabase directly, not here.

export type Availability = "available" | "sold" | "reserved";

export type Camera = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  badge?: string;
  availability: Availability;
  image: string;
  tint: string;
};

const PLACEHOLDER_IMAGES = [
  "https://images.pexels.com/photos/13766527/pexels-photo-13766527.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720",
  "https://images.pexels.com/photos/32203084/pexels-photo-32203084.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720",
  "https://images.pexels.com/photos/32203085/pexels-photo-32203085.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720",
  "https://images.pexels.com/photos/18356977/pexels-photo-18356977.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720",
  "https://images.pexels.com/photos/15947569/pexels-photo-15947569.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720",
  "https://images.pexels.com/photos/3738947/pexels-photo-3738947.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720",
];
const TINTS = ["from-cream-200", "from-flash-50"];

// The featured "drop" — highest-value available units from the 27th Collection.
// image/tint are placeholder stock photos — swap for real unit photos before go-live.
export const CAMERAS: Camera[] = [
  {
    id: "coolpix-s8200-lightgold",
    name: "Nikon Coolpix S8200 Light Gold",
    price: 13599,
    badge: "27th Collection",
    availability: "available",
    image: PLACEHOLDER_IMAGES[0],
    tint: TINTS[0],
  },
  {
    id: "coolpix-s3700-black",
    name: "Nikon Coolpix S3700 Black",
    price: 10599,
    badge: "27th Collection",
    availability: "available",
    image: PLACEHOLDER_IMAGES[1],
    tint: TINTS[1],
  },
  {
    id: "cybershot-w570-silver",
    name: "Sony Cybershot DSC-W570 Silver",
    price: 9599,
    badge: "Fan favorite",
    availability: "available",
    image: PLACEHOLDER_IMAGES[2],
    tint: TINTS[0],
  },
  {
    id: "olympus-az1-silver",
    name: "Olympus AZ-1 Silver",
    price: 9599,
    badge: "Rare find",
    availability: "available",
    image: PLACEHOLDER_IMAGES[3],
    tint: TINTS[1],
  },
  {
    id: "coolpix-s3700-pink",
    name: "Nikon Coolpix S3700 Pink (Unit 1)",
    price: 9599,
    badge: "Fan favorite",
    availability: "available",
    image: PLACEHOLDER_IMAGES[4],
    tint: TINTS[0],
  },
  {
    id: "cybershot-t90-white",
    name: "Sony Cybershot DSC-T90 White",
    price: 8599,
    badge: "Pocket icon",
    availability: "available",
    image: PLACEHOLDER_IMAGES[5],
    tint: TINTS[1],
  },
];

// ---- Full catalog (price list) ----
export type CatalogItem = {
  id: string;
  name: string;
  price: number;
  availability: Availability;
};

export const CAMCORDERS: CatalogItem[] = [
  { id: "cc-1", name: "Sony HDR-CX670 Pink", price: 0, availability: "sold" },
  { id: "cc-2", name: "JVC GZ-E180-R Red", price: 6599, availability: "available" },
  { id: "cc-3", name: "JVC GZ-HM280-R Red", price: 6599, availability: "available" },
  { id: "cc-4", name: "Panasonic HDC-TM45", price: 0, availability: "sold" },
];

export const DIGICAMS_BY_BRAND: { brand: string; items: CatalogItem[] }[] = [
  {
    brand: "Sony",
    items: [
      { id: "dc-sony-1", name: "Sony Cybershot DSC-W570 Silver", price: 9599, availability: "available" },
      { id: "dc-sony-2", name: "Sony Cybershot DSC-T90 White", price: 8599, availability: "available" },
      { id: "dc-sony-3", name: "Sony Cybershot DSC-HX5 Rose Gold/Silver", price: 7599, availability: "available" },
      { id: "dc-sony-4", name: "Sony Cybershot DSC-WX1 Gold", price: 6599, availability: "available" },
      { id: "dc-sony-5", name: "Sony Cybershot DSC-TX10 Silver", price: 6599, availability: "available" },
      { id: "dc-sony-6", name: "Sony Cybershot DSC-HX7V Blue", price: 8599, availability: "available" },
      { id: "dc-sony-7", name: "Sony Cybershot DSC-HX5V Gold", price: 7599, availability: "available" },
    ],
  },
  {
    brand: "Nikon",
    items: [
      { id: "dc-nikon-1", name: "Nikon Coolpix S3700 (Unit 1) Pink", price: 9599, availability: "available" },
      { id: "dc-nikon-2", name: "Nikon Coolpix S6200 Blue", price: 8599, availability: "available" },
      { id: "dc-nikon-3", name: "Nikon Coolpix S3100 Lime", price: 8599, availability: "available" },
      { id: "dc-nikon-4", name: "Nikon Coolpix A100 Red", price: 7599, availability: "available" },
      { id: "dc-nikon-5", name: "Nikon Coolpix S3400 Silver", price: 7599, availability: "available" },
      { id: "dc-nikon-6", name: "Nikon Coolpix S8200 Light Gold", price: 13599, availability: "available" },
      { id: "dc-nikon-7", name: "Nikon Coolpix S3700 Black", price: 10599, availability: "available" },
      { id: "dc-nikon-8", name: "Nikon Coolpix S100 Hot Pink", price: 6599, availability: "available" },
    ],
  },
  {
    brand: "Others",
    items: [
      { id: "dc-oth-1", name: "Olympus AZ-1 Silver", price: 9599, availability: "available" },
      { id: "dc-oth-2", name: "Olympus VG-170 White", price: 7599, availability: "available" },
      { id: "dc-oth-3", name: "Casio Exilim EX-ZS150 Gold", price: 7599, availability: "available" },
      { id: "dc-oth-4", name: "Panasonic Lumix DMC-FP1 Pink", price: 7599, availability: "available" },
      { id: "dc-oth-5", name: "Panasonic Lumix DMC-S2 Pink", price: 0, availability: "sold" },
      { id: "dc-oth-6", name: "Panasonic Lumix DMC-FX8 Silver", price: 6599, availability: "available" },
      { id: "dc-oth-7", name: "Kyocera Finecam SL300R Silver - Green", price: 0, availability: "reserved" },
      { id: "dc-oth-8", name: "Minolta DiMage Xt", price: 5599, availability: "available" },
      { id: "dc-oth-9", name: "Olympus U750 Pink", price: 5599, availability: "available" },
      { id: "dc-oth-10", name: "Panasonic Lumix DMC-FX77 White", price: 8599, availability: "available" },
      { id: "dc-oth-11", name: "Casio Exilim EX-ZS25 Pink", price: 0, availability: "sold" },
      { id: "dc-oth-12", name: "Panasonic Lumix DMC-TZ5 Silver", price: 0, availability: "sold" },
      { id: "dc-oth-13", name: "Casio Exilim EX-M1 Silver", price: 4599, availability: "available" },
    ],
  },
];
