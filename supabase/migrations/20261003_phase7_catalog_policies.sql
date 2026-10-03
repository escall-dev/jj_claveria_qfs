-- ==============================================================================
-- JJ CLAVERIA Quotation Form System (QFS)
-- Migration: 20261003_phase7_catalog_policies.sql
-- Description: Phase 7 Catalog Row Level Security (RLS) Policies
-- Enables authenticated application access to catalog tables: brands, uoms, products
-- ==============================================================================

-- 1. Brands Policies
create policy "Allow app access to brands" on public.brands
  for all
  using (true)
  with check (true);

-- 2. UOMs Policies
create policy "Allow app access to uoms" on public.uoms
  for all
  using (true)
  with check (true);

-- 3. Products Policies
create policy "Allow app access to products" on public.products
  for all
  using (true)
  with check (true);
