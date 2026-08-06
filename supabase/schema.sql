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
  shipping_fee_php integer not null default 0, -- reference only; collected COD by the courier, not charged online
  total_php integer not null,
  paymongo_checkout_session_id text,
  paymongo_payment_intent_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists units (
  id text primary key,
  category text not null check (category in ('digicam', 'camcorder')),
  brand text,
  name text not null,
  price_php integer not null,
  old_price_php integer,
  badge text,
  best_for text,
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
-- Migration for databases created before best_for existed (fresh installs already get
-- it from the CREATE TABLE above).
alter table units add column if not exists best_for text;

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

-- RLS on, no policies: only the secret/service_role key (used exclusively by our own
-- /api functions) can touch these tables. Without this, Supabase's auto-generated REST
-- API would expose customer PII (orders.shipping_address, etc.) to anyone holding even
-- the publishable key, since these tables have no policies to otherwise restrict access.
alter table orders enable row level security;
alter table units enable row level security;
alter table kits enable row level security;
alter table order_items enable row level security;

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

-- Every minute, release checkout reservations nobody paid for.
-- (The reservation UPDATE in server/db.ts already treats expired rows as steal-able
-- immediately, so this is housekeeping for the Table Editor view, not the safety net itself.)
select cron.schedule(
  'release-expired-reservations',
  '* * * * *',
  $$
    update units
    set status = 'available', reservation_expires_at = null, reserved_order_id = null
    where status = 'reserved' and reservation_expires_at < now();
  $$
) where not exists (
  select 1 from cron.job where jobname = 'release-expired-reservations'
);
