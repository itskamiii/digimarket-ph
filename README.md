# Digimarket_PH

Online store for [Digimarket_PH](https://digimarketph.com) — a real Philippines-based small business reselling hand-tested vintage 2000s digicams and camcorders. It's the single place customers browse, buy, and arrange shipping, replacing a purely DM-based sales flow.

Instagram: [@digimarket_ph](https://instagram.com/digimarket_ph)

## Stack

- **Frontend** — Vite 7 + React 19 + TypeScript (strict) + Tailwind CSS 4 + Framer Motion, built as a single self-contained HTML file via `vite-plugin-singlefile`
- **Backend** — Vercel Serverless Functions (`/api`), Web-standard `Request`/`Response`
- **Database** — Supabase Postgres, service-role access only (RLS on, no policies), `pg_cron` for scheduled sweeps
- **Payments** — PayMongo Checkout Sessions
- **Hosting** — Vercel, custom domain `digimarketph.com`

## Features

- Live catalog synced from Supabase — units are one-of-a-kind, kits allow quantity
- Courier-first checkout: LBC, Lalamove, DHL, Meet up, or Pick up, each with its own payment options
- Full payment or Layaway (5% reservation fee added to the price, 30% of that new total due now, balance within 30 days, paid later via a real follow-up link)
- Atomic inventory reservation so two customers can never buy the same one-of-a-kind unit
- Searchable PH address entry with province/city lookup and postal code auto-fill
- One email per order telling you exactly what still needs manual follow-up — courier booking, DHL rate quoting, layaway balance reminders
- Real collection-drop email list (subscribe/unsubscribe both self-serve) — no third-party mailing list service
- First-visit language prompt for international buyers — the answer rides along with their order so you know what language to reply in

## Project structure

```
api/                          Vercel serverless functions
  checkout.ts                   Main checkout endpoint
  checkout/                     Sub-endpoints — cancel, Lalamove fee preview, pay a layaway balance
  webhooks/paymongo.ts          PayMongo payment webhook
  cron/                         Scheduled jobs — layaway balance reminders
  order-status.ts               Order lookup (unauthenticated, minimal data)
  pay-balance-status.ts         Layaway balance lookup (unauthenticated, minimal data)
  products.ts                   Catalog feed
  subscribe.ts, unsubscribe.ts  Collection-drop email list

server/                       Shared server-side logic imported by api/ functions
  db.ts, supabase.ts, paymongo.ts, lalamove.ts, notify.ts, rateLimit.ts, types.ts

src/                          React app
  components/, context/, hooks/, lib/

supabase/schema.sql            Full database schema — run once in the Supabase SQL Editor
scripts/                       One-off scripts (seeding, backups) — run locally with tsx
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

`npm run dev` runs the Vite frontend only. To exercise `/api` routes locally, use `vercel dev` instead (needs the [Vercel CLI](https://vercel.com/docs/cli) and the project linked via `vercel link`).

### Environment variables

See `.env.example` for the full list. Everything is server-only except `VITE_FORMSPREE_ENDPOINT`, which gets baked into the client bundle at build time.

### Database

Run `supabase/schema.sql` once in the Supabase SQL Editor. It's safe to re-run — every statement is guarded with `IF NOT EXISTS`/`OR REPLACE`.

## Deployment

Pushing to `main` deploys automatically via Vercel. The layaway reminder cron (`api/cron/layaway-reminders.ts`) runs daily per `vercel.json` and requires `CRON_SECRET` to be set in Vercel's environment variables.