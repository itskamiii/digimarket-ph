// Matches the site's existing FAQ copy: "Cash on Delivery within Metro Manila."
const METRO_MANILA_CITIES = new Set([
  "manila",
  "quezon city",
  "caloocan",
  "las pinas",
  "las piñas",
  "makati",
  "malabon",
  "mandaluyong",
  "marikina",
  "muntinlupa",
  "navotas",
  "paranaque",
  "parañaque",
  "pasay",
  "pasig",
  "san juan",
  "taguig",
  "valenzuela",
  "pateros",
]);

export function isMetroManila(city: string): boolean {
  return METRO_MANILA_CITIES.has(city.trim().toLowerCase());
}
