// Unit photos and payment QR codes are mirrored into public/unit-photos/ (kept in sync
// with Supabase Storage via `npm run sync-images`) and served directly by Vercel's own
// static hosting instead of Supabase — see README's "Images" section for why and the
// workflow this requires. Supabase's `units`/`kits` rows still store the full Supabase
// Storage URL as the source of truth (so the sync script always knows what to mirror);
// this strips the Supabase origin + storage-API prefix down to a root-relative path,
// leaving the bucket's own folder structure (e.g. "unit-photos/dc-oth-19.jpg",
// "unit-photos/payment-qr/bdo.jpg") intact — query strings (sample photos' cache-busting
// ?v=...) are preserved untouched since the regex only touches the prefix.
const SUPABASE_STORAGE_PREFIX_RE = /^https?:\/\/[^/]+\/storage\/v1\/object\/public\//;

export function localizeImageUrl(url: string): string;
export function localizeImageUrl(url: string | null | undefined): string | undefined;
export function localizeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(SUPABASE_STORAGE_PREFIX_RE, "/");
}
