-- ==============================================================================
-- JJ CLAVERIA Quotation Form System (QFS)
-- Migration: 20261004_phase11_quotation_persistence.sql
-- Description: Phase 11 Quotation Persistence, Customer Snapshots, and Atomic Save RPC
-- Tables Affected: quotations, quotation_items
-- ==============================================================================

-- 1. Make customer_id nullable and update foreign key to ON DELETE SET NULL
alter table public.quotations 
  alter column customer_id drop not null;

alter table public.quotations 
  drop constraint if exists quotations_customer_id_fkey;

alter table public.quotations 
  add constraint quotations_customer_id_fkey 
  foreign key (customer_id) 
  references public.customers(id) 
  on delete set null;

-- 2. Add historical customer snapshot columns to quotations table
alter table public.quotations 
  add column if not exists customer_name text,
  add column if not exists customer_address text,
  add column if not exists contact_person text,
  add column if not exists contact_number text;

-- If any historical rows exist without customer snapshot, backfill from customers table
update public.quotations q
set 
  customer_name = coalesce(q.customer_name, c.name, 'Unknown Customer'),
  customer_address = coalesce(q.customer_address, c.address, 'Unknown Address'),
  contact_person = coalesce(q.contact_person, c.contact_person),
  contact_number = coalesce(q.contact_number, c.contact_number)
from public.customers c
where q.customer_id = c.id
  and (q.customer_name is null or q.customer_address is null);

-- Set NOT NULL constraints on mandatory customer snapshot fields
alter table public.quotations 
  alter column customer_name set not null,
  alter column customer_address set not null;

-- 3. Relax created_by constraint to accommodate application session identifiers
alter table public.quotations 
  drop constraint if exists quotations_created_by_fkey;

alter table public.quotations 
  alter column created_by type text using created_by::text;

-- 4. Additional indexes for customer snapshot search
create index if not exists idx_quotations_customer_name on public.quotations(customer_name);

-- ==============================================================================
-- 5. Atomic Quotation Persistence Function (RPC)
-- ==============================================================================
create or replace function public.save_quotation_atomic(
  p_qf_number text,
  p_quotation_date date,
  p_customer_name text,
  p_customer_address text,
  p_contact_person text,
  p_contact_number text,
  p_total_amount numeric,
  p_created_by text,
  p_customer_id uuid default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_quotation_id uuid;
  v_item record;
  v_index int := 1;
begin
  -- Validate mandatory header fields
  if coalesce(trim(p_qf_number), '') = '' then
    return jsonb_build_object('success', false, 'error', 'QF Number is required');
  end if;

  if p_quotation_date is null then
    return jsonb_build_object('success', false, 'error', 'Quotation date is required');
  end if;

  if coalesce(trim(p_customer_name), '') = '' then
    return jsonb_build_object('success', false, 'error', 'Company name is required');
  end if;

  if coalesce(trim(p_customer_address), '') = '' then
    return jsonb_build_object('success', false, 'error', 'Company address is required');
  end if;

  if jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('success', false, 'error', 'At least one quotation item is required');
  end if;

  -- Verify QF number uniqueness
  if exists (select 1 from public.quotations where qf_number = trim(p_qf_number)) then
    return jsonb_build_object(
      'success', false, 
      'error', 'QF Number "' || trim(p_qf_number) || '" already exists. Please use a unique QF Number.'
    );
  end if;

  -- Insert quotation header snapshot
  insert into public.quotations (
    qf_number,
    quotation_date,
    customer_id,
    customer_name,
    customer_address,
    contact_person,
    contact_number,
    total_amount,
    status,
    created_by
  ) values (
    trim(p_qf_number),
    p_quotation_date,
    p_customer_id,
    trim(p_customer_name),
    trim(p_customer_address),
    nullif(trim(p_contact_person), ''),
    nullif(trim(p_contact_number), ''),
    coalesce(p_total_amount, 0),
    'draft',
    p_created_by
  ) returning id into v_quotation_id;

  -- Insert quotation line item snapshots
  for v_item in select * from jsonb_to_recordset(p_items) as x(
    product_id uuid,
    item_number int,
    item_description text,
    brand_name text,
    uom text,
    unit_price numeric,
    quantity numeric,
    item_total numeric
  ) loop
    if coalesce(trim(v_item.item_description), '') = '' then
      raise exception 'Item description cannot be empty for item row %', v_index;
    end if;

    if coalesce(trim(v_item.uom), '') = '' then
      raise exception 'Unit of measure cannot be empty for item row %', v_index;
    end if;

    if v_item.unit_price is null or v_item.unit_price < 0 then
      raise exception 'Unit price must be non-negative for item row %', v_index;
    end if;

    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Quantity must be greater than zero for item row %', v_index;
    end if;

    insert into public.quotation_items (
      quotation_id,
      product_id,
      item_number,
      item_description,
      brand_name,
      uom,
      unit_price,
      quantity,
      item_total
    ) values (
      v_quotation_id,
      v_item.product_id,
      coalesce(v_item.item_number, v_index),
      trim(v_item.item_description),
      nullif(trim(v_item.brand_name), ''),
      trim(v_item.uom),
      round(v_item.unit_price, 2),
      round(v_item.quantity, 3),
      round(coalesce(v_item.item_total, v_item.unit_price * v_item.quantity), 2)
    );

    v_index := v_index + 1;
  end loop;

  return jsonb_build_object(
    'success', true, 
    'quotation_id', v_quotation_id,
    'qf_number', trim(p_qf_number)
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
end;
$$;

grant execute on function public.save_quotation_atomic to anon, authenticated, service_role;

-- ==============================================================================
-- 6. Quotation History List Function (RPC)
-- ==============================================================================
create or replace function public.get_quotations_list()
returns table (
  id uuid,
  qf_number text,
  quotation_date date,
  customer_name text,
  customer_address text,
  contact_person text,
  contact_number text,
  total_amount numeric,
  status text,
  created_by text,
  created_at timestamptz
)
language sql
security definer
stable
as $$
  select 
    q.id,
    q.qf_number,
    q.quotation_date,
    q.customer_name,
    q.customer_address,
    q.contact_person,
    q.contact_number,
    q.total_amount,
    q.status,
    q.created_by,
    q.created_at
  from public.quotations q
  order by q.quotation_date desc, q.created_at desc;
$$;

grant execute on function public.get_quotations_list to anon, authenticated, service_role;

-- ==============================================================================
-- 7. Quotation Detail Function (RPC)
-- ==============================================================================
create or replace function public.get_quotation_detail(p_quotation_id uuid)
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', q.id,
    'qf_number', q.qf_number,
    'quotation_date', q.quotation_date,
    'customer_id', q.customer_id,
    'customer_name', q.customer_name,
    'customer_address', q.customer_address,
    'contact_person', q.contact_person,
    'contact_number', q.contact_number,
    'total_amount', q.total_amount,
    'status', q.status,
    'created_by', q.created_by,
    'created_at', q.created_at,
    'updated_at', q.updated_at,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', qi.id,
            'quotation_id', qi.quotation_id,
            'product_id', qi.product_id,
            'item_number', qi.item_number,
            'item_description', qi.item_description,
            'brand_name', qi.brand_name,
            'uom', qi.uom,
            'unit_price', qi.unit_price,
            'quantity', qi.quantity,
            'item_total', qi.item_total,
            'created_at', qi.created_at
          ) order by qi.item_number asc
        )
        from public.quotation_items qi
        where qi.quotation_id = q.id
      ),
      '[]'::jsonb
    )
  ) into v_result
  from public.quotations q
  where q.id = p_quotation_id;

  return v_result;
end;
$$;

grant execute on function public.get_quotation_detail to anon, authenticated, service_role;
