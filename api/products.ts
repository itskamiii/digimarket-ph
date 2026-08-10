import { getProducts } from "../server/db.js";
import type { UnitRow } from "../server/types.js";

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
    const { units, kits } = await getProducts();

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
