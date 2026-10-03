-- ==============================================================================
-- JJ CLAVERIA Quotation Form System (QFS)
-- Migration: 20261003_phase6_initial_schema.sql
-- Description: Phase 6 Initial PostgreSQL Database Schema for Supabase
-- Tables: profiles, brands, uoms, products, customers, quotations, quotation_items
-- ==============================================================================

-- Enable pgcrypto extension for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. Helper Functions & Triggers
-- ==============================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ==============================================================================
-- 2. profiles (User/Staff Account Records)
-- ==============================================================================

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  display_name text not null,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application account records for PIN authentication.';
comment on column public.profiles.pin_hash is 'Opaque cryptographic scrypt hash of the PIN. Plaintext is never stored.';

create trigger trigger_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ==============================================================================
-- 3. brands (Brand Catalog)
-- ==============================================================================

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brands is 'Reusable brand catalog entries.';

create trigger trigger_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- ==============================================================================
-- 4. uoms (Unit of Measurement Catalog)
-- ==============================================================================

create table if not exists public.uoms (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  abbreviation text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.uoms is 'Commercial units of measurement (no scientific conversion logic).';

-- ==============================================================================
-- 5. products (Product Catalog)
-- ==============================================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  name text not null,
  description text,
  default_uom_id uuid references public.uoms(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is 'Reusable item and product catalog.';

create trigger trigger_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ==============================================================================
-- 6. customers (Customer & Company Records)
-- ==============================================================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  contact_person text,
  contact_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customers is 'Reusable quotation customer directory.';

create trigger trigger_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ==============================================================================
-- 7. quotations (Quotation Headers)
-- ==============================================================================

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  qf_number text unique not null,
  quotation_date date not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  status text not null default 'draft' check (status in ('draft', 'finalized', 'cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.quotations is 'Quotation document headers.';

create trigger trigger_quotations_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

-- ==============================================================================
-- 8. quotation_items (Individual Quotation Line Items)
-- ==============================================================================

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  item_number integer not null check (item_number > 0),
  item_description text not null,
  brand_name text,
  uom text not null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  quantity numeric(14,3) not null check (quantity > 0),
  item_total numeric(14,2) not null check (item_total >= 0),
  created_at timestamptz not null default now(),
  constraint quotation_items_quotation_item_number_key unique (quotation_id, item_number)
);

comment on table public.quotation_items is 'Quotation line items. Stores snapshot copies of description, brand, UOM, and price to preserve historical integrity.';

-- ==============================================================================
-- 9. Indexes
-- ==============================================================================

create index if not exists idx_brands_name on public.brands(name);
create index if not exists idx_products_name on public.products(name);
create index if not exists idx_products_brand_id on public.products(brand_id);
create index if not exists idx_products_default_uom_id on public.products(default_uom_id);
create index if not exists idx_customers_name on public.customers(name);
create index if not exists idx_quotations_qf_number on public.quotations(qf_number);
create index if not exists idx_quotations_customer_id on public.quotations(customer_id);
create index if not exists idx_quotations_created_by on public.quotations(created_by);
create index if not exists idx_quotations_quotation_date on public.quotations(quotation_date);
create index if not exists idx_quotations_status on public.quotations(status);
create index if not exists idx_quotation_items_quotation_id on public.quotation_items(quotation_id);
create index if not exists idx_quotation_items_product_id on public.quotation_items(product_id);

-- ==============================================================================
-- 10. Row Level Security (RLS)
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.uoms enable row level security;
alter table public.customers enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

-- ==============================================================================
-- 11. Baseline Seed Data: Commercial Selling Units (UOMs)
-- ==============================================================================

insert into public.uoms (name, abbreviation, active) values
  ('Liter', 'L', true),
  ('Gallon', 'gal', true),
  ('Kilogram', 'kg', true),
  ('Gram', 'g', true),
  ('Ton', 't', true),
  ('Drum', 'drum', true),
  ('Tub', 'tub', true),
  ('Pail', 'pail', true),
  ('Piece', 'pc', true),
  ('Unit', 'unit', true),
  ('Meter', 'm', true),
  ('Roll', 'roll', true),
  ('Box', 'box', true),
  ('Pack', 'pack', true),
  ('Set', 'set', true)
on conflict (name) do nothing;
