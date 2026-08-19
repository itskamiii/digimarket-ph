import { getSupabase } from "../server/supabase.js";

// Payment QR codes (GCash, Maya, bank transfer, etc.) live in the public unit-photos
// bucket under payment-qr/ — same bucket as camera photos since these are equally public,
// just a different folder. Listed dynamically (not hardcoded) so dropping a new file in
// that folder (e.g. payment-qr/gcash.jpg) makes it appear on the checkout page with no
// code change — same self-adapting pattern as the catalog's brand/collection filter
// chips. The label shown to customers is derived from the filename.
const FOLDER = "payment-qr";

// Generic title-casing gets brand names like BDO/GCash/RCBC wrong ("Bdo", "Gcash",
// "Rcbc") — known PH banks/wallets get their real capitalization here; anything else
// (a future QR the owner adds) still falls through to the generic title-case so it's
// never left unlabeled.
const KNOWN_LABELS: Record<string, string> = {
  bdo: "BDO",
  bpi: "BPI",
  gcash: "GCash",
  maya: "Maya",
  paymaya: "Maya",
  rcbc: "RCBC",
  maribank: "MariBank",
  unionbank: "UnionBank",
  metrobank: "Metrobank",
  landbank: "Landbank",
  seabank: "SeaBank",
  grabpay: "GrabPay",
};

function labelFromFilename(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]?qr$/i, ""); // "bdo-qr.jpg" -> "bdo", not "Bdo Qr"
  const words = base.split(/[-_]+/).filter(Boolean);
  return words
    .map((word) => KNOWN_LABELS[word.toLowerCase()] ?? word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export async function GET() {
  try {
    const { data, error } = await getSupabase().storage.from("unit-photos").list(FOLDER, {
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;

    const codes = (data ?? [])
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name))
      .map((f) => {
        const { data: pub } = getSupabase().storage.from("unit-photos").getPublicUrl(`${FOLDER}/${f.name}`);
        return { label: labelFromFilename(f.name), imageUrl: pub.publicUrl };
      });

    return Response.json({ codes }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("GET /api/payment-qr failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}