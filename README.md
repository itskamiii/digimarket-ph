# Digimarket_PH

Online store for [Digimarket_PH](https://digimarketph.com) — a real Philippines-based small business reselling hand-tested vintage 2000s digicams and camcorders. It's the single place customers browse, buy, and arrange shipping, replacing a purely DM-based sales flow.

Instagram: [@digimarket_ph](https://instagram.com/digimarket_ph)

## Stack

- **Frontend** — Vite 7 + React 19 + TypeScript (strict) + Tailwind CSS 4 + Framer Motion, built as a single self-contained HTML file via `vite-plugin-singlefile`
- **Backend** — Vercel Serverless Functions (`/api`), Web-standard `Request`/`Response`
- **Database** — Supabase Postgres, service-role access only (RLS on, no policies), `pg_cron` for scheduled sweeps
- **Payments** — manual QR code + customer-uploaded proof of payment, owner verifies via a one-click email link (PayMongo code stays in the repo, dormant — moved off it to keep transaction volume from tripping a tax-reporting threshold)
- **Hosting** — Vercel, custom domain `digimarketph.com`

## Features

- Live catalog synced from Supabase — units are one-of-a-kind, kits allow quantity
- Courier-first checkout: LBC, Lalamove, DHL, Meet up, or Pick up, each with its own payment options
- Online payment is scan-a-QR-code + upload proof — no payment gateway. Every order is committed immediately (unit reserved, owner notified with a one-click "verify & mark paid" link); the owner checks the proof against their own GCash/Maya/bank app before it's really sold
- Full payment or Layaway (5% reservation fee added to the price, 30% of that new total due now, balance within 30 days, paid later via a real follow-up link — same QR + proof flow both times)
- Atomic inventory reservation so two customers can never buy the same one-of-a-kind unit
- Searchable PH address entry with province/city lookup and postal code auto-fill
- One email per order telling you exactly what still needs manual follow-up — courier booking, DHL rate quoting, layaway balance reminders
- Real collection-drop email list (subscribe/unsubscribe both self-serve) — no third-party mailing list service
- First-visit language prompt for international buyers — the answer rides along with their order so you know what language to reply in

## Project structure

```
api/                          Vercel serverless functions — capped at 11 of Vercel's Hobby-plan
                               12-per-deployment limit, so a few double up on responsibilities
                               (query params / a body field pick the branch) rather than each
                               getting its own file
  checkout.ts                   Main checkout endpoint
  checkout/                     Sub-endpoints — Lalamove fee preview, upload proof of payment,
                                 submit a layaway balance payment, verify a payment/balance/
                                 cancel (?action=, ?balance=1 — see verify.ts)
  payment-qr.ts                 Lists whatever QR codes are in storage (unit-photos/payment-qr/)
  webhooks/paymongo.ts          PayMongo payment webhook — dormant, kept as a fallback
  cron/                         Scheduled jobs — layaway balance reminders
  order-status.ts               Order + layaway balance lookup (?view=balance) — unauthenticated,
                                 minimal data
  products.ts                   Catalog feed
  subscribe.ts                  Collection-drop email list — subscribe and unsubscribe
                                 (action: "unsubscribe" in the body)

server/                       Shared server-side logic imported by api/ functions
  db.ts, supabase.ts, paymentProofs.ts, paymongo.ts (dormant), lalamove.ts, notify.ts,
  rateLimit.ts, types.ts

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