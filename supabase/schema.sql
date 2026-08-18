-- Digimarket_PH — run once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

create extension if not exists pg_cron;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null, -- { line1, line2?, city, province, postalCode }
  fulfillment_method text not null check (fulfillment_method in ('online', 'cod')),
  payment_method text, -- 'gcash' | 'paymaya' | 'grab_pay' | 'card' | 'cod', filled in once known
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'cod_pending', 'fulfilled', 'cancelled', 'expired')),
  subtotal_php integer not null,
  -- LBC: reference only, collected COD by the courier, never charged online. Lalamove:
  -- a real charge, folded into total_php and paid through PayMongo up front (Lalamove
  -- itself is prepay-only, no COD).
  shipping_fee_php integer not null default 0,
  total_php integer not null,
  paymongo_checkout_session_id text,
  paymongo_payment_intent_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration for databases created before shipping_method/Lalamove columns existed.
alter table orders add column if not exists shipping_method text not null default 'lbc'
  check (shipping_method in ('lbc', 'lalamove', 'dhl'));
alter table orders add column if not exists dropoff_lat double precision;
alter table orders add column if not exists dropoff_lng double precision;
alter table orders add column if not exists lalamove_order_id text;
alter table orders add column if not exists lalamove_share_link text;
alter table orders add column if not exists lalamove_status text;

-- Widen shipping_method to cover in-person meet up / pick up exchanges (no courier at
-- all). The ADD COLUMN above only sets the constraint on first creation, so an
-- already-migrated database needs this separate drop-and-recreate to widen it.
alter table orders drop constraint if exists orders_shipping_method_check;
alter table orders add constraint orders_shipping_method_check
  check (shipping_method in ('lbc', 'lalamove', 'dhl', 'meetup', 'pickup'));

-- Layaway: a 5% reservation fee is added ON TOP of the subtotal (New Total = subtotal *
-- 1.05), then a 30% down payment of that fee-inclusive New Total is charged now (folded
-- into the same PayMongo charge as any upfront courier fee); the rest is owed within 30
-- days and always collected manually — there's no recurring/scheduled charge in
-- PayMongo Checkout Sessions, so layaway_balance_php/due_at just track what's still
-- owed for the owner to follow up on. total_php still holds the FULL order value either
-- way (down payment + balance); layaway_balance_php is the portion of that not
-- collected at checkout time.
alter table orders add column if not exists payment_plan text not null default 'full'
  check (payment_plan in ('full', 'layaway'));
alter table orders add column if not exists layaway_balance_php integer;
-- Widened from integer once the layaway formula started producing centavos (the 5%
-- fee/30% down payment math no longer lands on whole pesos). double precision (not
-- numeric) so PostgREST/supabase-js keeps returning these as plain JS numbers instead
-- of strings.
alter table orders alter column total_php type double precision;
alter table orders alter column layaway_balance_php type double precision;
alter table orders add column if not exists layaway_balance_due_at timestamptz;

create table if not exists units (
  id text primary key,
  category text not null check (category in ('digicam', 'camcorder')),
  brand text,
  name text not null,
  price_php integer not null,
  old_price_php integer,
  badge text,
  best_for text,
  description text, -- full info-sheet text (vibe, key features, condition, inclusions, shipping)
  is_featured boolean not null default false,
  image_url text,
  tint text,
  status text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  reservation_expires_at timestamptz,
  reserved_order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists units_status_idx on units(status);
create index if not exists units_reserved_order_idx on units(reserved_order_id);
-- Migration for databases created before best_for/description existed (fresh installs
-- already get these from the CREATE TABLE above).
alter table units add column if not exists best_for text;
alter table units add column if not exists description text;
-- Shown on hover (desktop) / press-and-hold (mobile) over a catalog card, in place of
-- image_url — see CameraCard in src/components/Catalog.tsx. Null is a normal, handled
-- state (older/removed units without a back photo just never flip).
alter table units add column if not exists image_back_url text;
-- Real photos taken BY the camera (not photos of it) — shown via "View Sample Photos" in
-- the unit info modal as a swipeable gallery. Standardized to exactly 4 per unit where
-- available (see scripts/tmp-upload-samples.mjs); null/empty for units without any yet.
alter table units add column if not exists sample_photo_urls text[];

-- Migration: the 3x-installment feature was fabricated template content, not a real
-- offer — dropped from orders/kits along with the checkout UI that set/read it.
alter table orders drop column if exists installment_plan;
alter table kits drop column if exists monthly_php;

create table if not exists kits (
  id text primary key,
  name text not null,
  price_php integer not null,
  is_active boolean not null default true
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  item_type text not null check (item_type in ('unit', 'kit')),
  unit_id text references units(id),
  kit_id text references kits(id),
  name_snapshot text not null,
  price_php_snapshot integer not null,
  quantity integer not null default 1
);
create index if not exists order_items_order_id_idx on order_items(order_id);

-- Collection-drop email list — separate from customer PII in orders. `unique` on email
-- doubles as the subscribe endpoint's dedupe (re-subscribing an already-present email is
-- just a no-op upsert, not an error).
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- English name of the language the visitor picked on their first load (see
-- src/components/LanguagePrompt.tsx). Purely so the owner knows what language to reply
-- in — nothing reads it programmatically, and it's null whenever the prompt was skipped.
alter table orders add column if not exists native_language text;
alter table subscribers add column if not exists native_language text;

-- Unauthenticated + unlimited checkout attempts would let anyone perpetually re-reserve
-- a one-of-a-kind unit forever (re-triggering checkout every ~15 min, right as each
-- reservation is about to lapse) with zero cost to them — a standing denial-of-inventory
-- risk against a store where every item is irreplaceable. One row per checkout attempt;
-- server/rateLimit.ts counts recent rows per IP before allowing a new one through.
create table if not exists checkout_attempts (
  id bigint generated always as identity primary key,
  ip_address text not null,
  created_at timestamptz not null default now()
);
create index if not exists checkout_attempts_ip_created_idx on checkout_attempts(ip_address, created_at);
alter table checkout_attempts enable row level security;

-- Keeps the table from growing forever — old rows are only ever relevant for a few
-- minutes of rate-limit lookback.
select cron.schedule(
  'prune-checkout-attempts',
  '0 * * * *',
  $$ delete from checkout_attempts where created_at < now() - interval '1 day'; $$
);

-- RLS on, no policies: only the secret/service_role key (used exclusively by our own
-- /api functions) can touch these tables. Without this, Supabase's auto-generated REST
-- API would expose customer PII (orders.shipping_address, etc.) to anyone holding even
-- the publishable key, since these tables have no policies to otherwise restrict access.
alter table orders enable row level security;
alter table units enable row level security;
alter table kits enable row level security;
alter table order_items enable row level security;
alter table subscribers enable row level security;

-- Atomically claim units for an order. Only "wins" rows that are currently available,
-- or reserved-but-expired (so a stale reservation never blocks a second buyer even in
-- the up-to-a-minute window before the cron job below sweeps it). Returns the ids that
-- were actually claimed — the caller compares this against what it asked for.
-- ttl_minutes = NULL means an indefinite hold (used for COD orders, which are already
-- a committed sale with no payment-gateway confirmation step to time out on — same
-- mechanism as an owner-set manual hold in the Table Editor).
create or replace function reserve_units(unit_ids text[], p_order_id uuid, ttl_minutes integer default 15)
returns table(id text)
language sql
as $$
  update units
  set status = 'reserved',
      reservation_expires_at = case when ttl_minutes is null then null else now() + make_interval(mins => ttl_minutes) end,
      reserved_order_id = p_order_id,
      updated_at = now()
  where units.id = any(unit_ids)
    and (status = 'available' or (status = 'reserved' and reservation_expires_at < now()))
  returning units.id;
$$;

-- Called from the PayMongo webhook once a payment is confirmed. Idempotent: a unit only
-- flips once (it must still be 'reserved' for this exact order), so replayed webhook
-- deliveries are harmless no-ops.
create or replace function mark_units_sold(p_order_id uuid)
returns void
language sql
as $$
  update units
  set status = 'sold', reservation_expires_at = null, updated_at = now()
  where reserved_order_id = p_order_id and status = 'reserved';
$$;

revoke execute on function reserve_units(text[], uuid, integer) from public, anon, authenticated;
revoke execute on function mark_units_sold(uuid) from public, anon, authenticated;
grant execute on function reserve_units(text[], uuid, integer) to service_role;
grant execute on function mark_units_sold(uuid) to service_role;

-- Every minute, release checkout reservations nobody paid for, then expire the orders
-- that lost their reservation this way. Without the second statement, a "pending_payment"
-- order sits in that status forever even after its unit is long gone — and if PayMongo's
-- checkout session outlives our reservation TTL and the customer pays late, the webhook
-- would otherwise mark that dead order "paid" for a unit it no longer holds. Kit-only
-- orders are untouched (the `exists (... item_type = 'unit')` guard) since kits were never
-- unit-reservation-constrained in the first place.
-- (The reservation UPDATE in server/db.ts already treats expired rows as steal-able
-- immediately, so this is housekeeping for the Table Editor view, not the safety net itself.)
--
-- cron.schedule() upserts by job name (updates the existing job's command if one already
-- exists) — no "if not exists" guard here, unlike the rest of this file, since that guard
-- would silently block this job's body from ever being updated on a re-run.
select cron.schedule(
  'release-expired-reservations',
  '* * * * *',
  $$
    update units
    set status = 'available', reservation_expires_at = null, reserved_order_id = null
    where status = 'reserved' and reservation_expires_at < now();

    update orders o
    set status = 'expired', updated_at = now()
    where o.status = 'pending_payment'
      and o.fulfillment_method = 'online'
      and exists (select 1 from order_items oi where oi.order_id = o.id and oi.item_type = 'unit')
      and not exists (select 1 from units u where u.reserved_order_id = o.id and u.status = 'reserved');
  $$
);
