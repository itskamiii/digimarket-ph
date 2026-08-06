import { getProducts } from "../server/db";
import type { UnitRow } from "../server/types";

function toCamera(unit: UnitRow) {
  return {
    id: unit.id,
    name: unit.name,
    price: unit.price_php,
    oldPrice: unit.old_price_php ?? undefined,
    badge: unit.badge ?? undefined,
    availability: unit.status,
    image: unit.image_url ?? "",
    tint: unit.tint ?? "from-cream-200",
  };
}

function toCatalogItem(unit: UnitRow) {
  return { id: unit.id, name: unit.name, price: unit.price_php, availability: unit.status };
}

// "Others" is an intentional catch-all bucket and always sorts last; any other brand
// not in PREFERRED_BRAND_ORDER falls in between, alphabetically.
const PREFERRED_BRAND_ORDER = ["Sony", "Nikon"];
function brandRank(brand: string): number {
  if (brand === "Others") return Number.MAX_SAFE_INTEGER;
  const idx = PREFERRED_BRAND_ORDER.indexOf(brand);
  return idx === -1 ? PREFERRED_BRAND_ORDER.length : idx;
}

export async function GET() {
  try {
    const { units, kits } = await getProducts();

    const cameras = units.filter((u) => u.is_featured).map(toCamera);
    const camcorders = units.filter((u) => u.category === "camcorder").map(toCatalogItem);

    const digicams = units.filter((u) => u.category === "digicam");
    const brands = Array.from(new Set(digicams.map((u) => u.brand ?? "Others"))).sort((a, b) => {
      const diff = brandRank(a) - brandRank(b);
      return diff !== 0 ? diff : a.localeCompare(b);
    });
    const digicamsByBrand = brands.map((brand) => ({
      brand,
      items: digicams.filter((u) => (u.brand ?? "Others") === brand).map(toCatalogItem),
    }));

    const kitsPayload = kits.map((kit) => ({ id: kit.id, price: kit.price_php, monthly: kit.monthly_php }));

    return Response.json(
      { cameras, camcorders, digicamsByBrand, kits: kitsPayload },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("GET /api/products failed", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
