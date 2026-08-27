import { getProducts } from "../server/db.js";
import type { UnitRow } from "../server/types.js";

// PGRST303 ("JWT issued at future") is a real, observed-in-production Supabase/Vercel
// race condition: a freshly cold-started serverless instance's clock hasn't finished
// syncing yet, so our (perfectly valid, static) service-role token briefly looks
// "issued in the future" to Supabase's auth check. It's not a real fault — it clears up
// within moments on its own — but this is the one endpoint the entire site depends on to
// render anything, so a customer should never see a blank catalog over what's really
// just bad timing. Short, small-count retry rather than anything fancier.
function isTransientAuthClockSkew(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "PGRST303";
}

async function getProductsWithRetry(maxAttempts = 3): ReturnType<typeof getProducts> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getProducts();
    } catch (err) {
      if (attempt === maxAttempts || !isTransientAuthClockSkew(err)) throw err;
      console.error(`getProducts attempt ${attempt} hit PGRST303 (clock-skew race) — retrying`, err);
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
  throw new Error("unreachable");
}

function toCatalogItem(unit: UnitRow) {
  return {
    id: unit.id,
    name: unit.name,
    price: unit.price_php,
    oldPrice: unit.old_price_php ?? undefined,
    badge: unit.badge ?? undefined,
    bestFor: unit.best_for ?? undefined,
    availability: unit.status,
    image: unit.image_url ?? undefined,
    imageBack: unit.image_back_url ?? undefined,
    samplePhotos: unit.sample_photo_urls && unit.sample_photo_urls.length > 0 ? unit.sample_photo_urls : undefined,
    tint: unit.tint ?? "from-cream-200",
    description: unit.description ?? undefined,
  };
}

// Available units first (most expensive first, so the showcase leads with its best
// stuff), then reserved, then sold last — those aren't purchasable, so they sink to the
// bottom regardless of price.
const STATUS_RANK: Record<UnitRow["status"], number> = { available: 0, reserved: 1, sold: 2 };
function byStatusThenPriceDesc(a: UnitRow, b: UnitRow): number {
  const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  return statusDiff !== 0 ? statusDiff : b.price_php - a.price_php;
}

export async function GET() {
  try {
    const { units, kits } = await getProductsWithRetry();

    const camcorders = units
      .filter((u) => u.category === "camcorder")
      .sort(byStatusThenPriceDesc)
      .map(toCatalogItem);

    const digicams = units
      .filter((u) => u.category === "digicam")
      .sort(byStatusThenPriceDesc)
      .map(toCatalogItem);

    const kitsPayload = kits.map((kit) => ({ id: kit.id, price: kit.price_php }));

    return Response.json(
      { camcorders, digicams, kits: kitsPayload },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("GET /api/products failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
