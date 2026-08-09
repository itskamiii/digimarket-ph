// Manual backup: dumps every table to a timestamped JSON file under backups/
// (gitignored — this contains real customer names/emails/addresses).
//
//   npm run backup
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local. Run this
// periodically by hand (e.g. weekly) — there's no automation wired up, since
// the free Supabase plan doesn't include automated backups.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before backing up.");
}
const supabase = createClient(url, serviceKey);

const TABLES = ["units", "kits", "orders", "order_items"] as const;

async function main() {
  const dump: Record<string, unknown[]> = {};

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw new Error(`Failed to export "${table}": ${error.message}`);
    dump[table] = data ?? [];
    console.log(`${table}: ${dump[table].length} rows`);
  }

  mkdirSync("backups", { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `backups/backup-${timestamp}.json`;
  writeFileSync(path, JSON.stringify(dump, null, 2));
  console.log(`\nSaved to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
