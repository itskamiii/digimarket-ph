// Mirrors every unit photo and payment QR code out of Supabase Storage into
// public/unit-photos/ so Vercel serves them directly — no more site traffic hitting
// Supabase's egress quota (see server/localImageUrl.ts for the URL rewrite this feeds).
//
//   npm run sync-images
//
// Run this after uploading new photos to Supabase Storage (new collection, a swapped
// photo, a new QR code) and commit whatever lands under public/unit-photos/ — that's
// the one extra step true hardcoding costs us over the old "upload and it's instantly
// live" workflow. Safe to re-run anytime: always re-downloads, so it also picks up a
// photo that was replaced in place under the same filename.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before syncing.");
}
const supabase = createClient(url, serviceKey);

const BUCKET = "unit-photos";
const OUT_DIR = join(process.cwd(), "public", BUCKET);

// Same prefix server/localImageUrl.ts strips — kept in sync by hand since one's a
// browser-side regex over arbitrary Supabase projects and this is a local Node script
// that already knows this project's exact SUPABASE_URL.
function keyFromPublicUrl(publicUrl: string): string | null {
  const prefix = `${url}/storage/v1/object/public/${BUCKET}/`;
  if (!publicUrl.startsWith(prefix)) return null;
  const rest = publicUrl.slice(prefix.length);
  return rest.split("?")[0]; // drop any ?v=... cache-busting query — same file either way
}

async function main() {
  const keys = new Set<string>();

  const { data: units, error: unitsErr } = await supabase
    .from("units")
    .select("image_url, image_back_url, sample_photo_urls");
  if (unitsErr) throw new Error(`Failed to list units: ${unitsErr.message}`);

  for (const u of units ?? []) {
    const urls = [u.image_url, u.image_back_url, ...(u.sample_photo_urls ?? [])].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );
    for (const u2 of urls) {
      const key = keyFromPublicUrl(u2);
      if (key) keys.add(key);
    }
  }

  const { data: qrFiles, error: qrErr } = await supabase.storage.from(BUCKET).list("payment-qr");
  if (qrErr) throw new Error(`Failed to list payment-qr/: ${qrErr.message}`);
  for (const f of qrFiles ?? []) {
    if (/\.(jpe?g|png|webp)$/i.test(f.name)) keys.add(`payment-qr/${f.name}`);
  }

  console.log(`Found ${keys.size} unique files to mirror.\n`);

  let okCount = 0;
  let totalBytes = 0;
  const failed: string[] = [];

  for (const key of keys) {
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (error || !data) {
      console.error(`  FAILED  ${key} — ${error?.message ?? "no data"}`);
      failed.push(key);
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    const destPath = join(OUT_DIR, key);
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, buf);
    totalBytes += buf.byteLength;
    okCount++;
    console.log(`  ok      ${key} (${(buf.byteLength / 1024).toFixed(0)}KB)`);
  }

  console.log(`\nMirrored ${okCount}/${keys.size} files, ${(totalBytes / 1024 / 1024).toFixed(2)}MB total.`);
  if (failed.length > 0) {
    console.error(`\n${failed.length} file(s) failed:`, failed);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
