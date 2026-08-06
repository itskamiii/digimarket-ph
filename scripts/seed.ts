// One-off: populate Supabase's `units`/`kits` tables from the site's original static
// content. Run once after `supabase/schema.sql` has been applied:
//
//   npm run seed
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local. Safe to re-run
// (upserts by id) if you need to reset the DB back to the original seed content.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
import { PLANS } from "../src/lib/data";
import { CAMCORDERS, CAMERAS, DIGICAMS_BY_BRAND } from "../src/lib/seed-data";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.");
}
const supabase = createClient(url, serviceKey);

type UnitRow = {
  id: string;
  category: "digicam" | "camcorder";
  brand: string | null;
  name: string;
  price_php: number;
  old_price_php: number | null;
  badge: string | null;
  is_featured: boolean;
  image_url: string | null;
  tint: string | null;
  status: "available" | "sold" | "reserved";
};

// The full-catalog price list (src/lib/seed-data.ts) independently duplicates every
// physical unit that's also in the featured `CAMERAS` drop, sometimes with different
// word order in the name (e.g. "S3700 Pink (Unit 1)" vs "S3700 (Unit 1) Pink") — so
// this can't be deduped by exact string match. Cross-referenced by hand against the
// 6 CAMERAS entries; maps each featured id to its catalog brand (so the unit carries
// the same brand it already has in the full catalog) and the catalog row to skip.
const FEATURED_TO_CATALOG: Record<string, { catalogId: string; brand: string }> = {
  "coolpix-s8200-lightgold": { catalogId: "dc-nikon-6", brand: "Nikon" },
  "coolpix-s3700-black": { catalogId: "dc-nikon-7", brand: "Nikon" },
  "cybershot-w570-silver": { catalogId: "dc-sony-1", brand: "Sony" },
  "olympus-az1-silver": { catalogId: "dc-oth-1", brand: "Others" },
  "coolpix-s3700-pink": { catalogId: "dc-nikon-1", brand: "Nikon" },
  "cybershot-t90-white": { catalogId: "dc-sony-2", brand: "Sony" },
};
const FEATURED_DUPLICATE_CATALOG_IDS = new Set(
  Object.values(FEATURED_TO_CATALOG).map((v) => v.catalogId)
);

async function main() {
  const units: UnitRow[] = [];

  for (const cam of CAMERAS) {
    const mapping = FEATURED_TO_CATALOG[cam.id];
    if (!mapping) throw new Error(`No brand mapping for featured camera "${cam.id}" — add one to FEATURED_TO_CATALOG.`);
    units.push({
      id: cam.id,
      category: "digicam",
      brand: mapping.brand,
      name: cam.name,
      price_php: cam.price,
      old_price_php: cam.oldPrice ?? null,
      badge: cam.badge ?? null,
      is_featured: true,
      image_url: cam.image,
      tint: cam.tint,
      status: cam.availability,
    });
  }

  for (const cc of CAMCORDERS) {
    units.push({
      id: cc.id,
      category: "camcorder",
      brand: null,
      name: cc.name,
      price_php: cc.price,
      old_price_php: null,
      badge: null,
      is_featured: false,
      image_url: null,
      tint: null,
      status: cc.availability,
    });
  }

  let skipped = 0;
  for (const group of DIGICAMS_BY_BRAND) {
    for (const item of group.items) {
      if (FEATURED_DUPLICATE_CATALOG_IDS.has(item.id)) {
        skipped++;
        continue;
      }
      units.push({
        id: item.id,
        category: "digicam",
        brand: group.brand,
        name: item.name,
        price_php: item.price,
        old_price_php: null,
        badge: null,
        is_featured: false,
        image_url: null,
        tint: null,
        status: item.availability,
      });
    }
  }

  const { error: unitsError } = await supabase.from("units").upsert(units, { onConflict: "id" });
  if (unitsError) throw unitsError;
  console.log(`Seeded ${units.length} units (skipped ${skipped} catalog rows that duplicate a featured unit).`);

  const kits = PLANS.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price_php: plan.price,
    is_active: true,
  }));
  const { error: kitsError } = await supabase.from("kits").upsert(kits, { onConflict: "id" });
  if (kitsError) throw kitsError;
  console.log(`Seeded ${kits.length} kits.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
