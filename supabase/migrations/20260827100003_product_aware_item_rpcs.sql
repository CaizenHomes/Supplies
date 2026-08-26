-- Feature 3a: product-linking for the two "create an item" entry points (Groceries
-- wishlist, Supplies requests). Both need the same lookup-or-create-a-product decision,
-- so it lives once in resolve_product_id() and each RPC calls it before inserting.
--
-- Rules:
--  - If the client already resolved a product (user picked a suggestion from the
--    combobox), p_product_id is passed straight through — linking to an existing
--    product is fine for any role, since everyone can already SELECT products.
--  - If not, and a name was typed, only manager/executive callers get a lookup-or-create;
--    staff typing free text never touches the products table, so product_id stays null.
--  - The name match is case-insensitive so "kirkland coffee" reuses an existing
--    "Kirkland Coffee" row instead of creating a near-duplicate.
create or replace function public.resolve_product_id(
  p_product_id   uuid,
  p_product_name text,
  p_vendor       text,
  p_unit_price   numeric
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_product_id uuid;
  v_name       text := nullif(trim(coalesce(p_product_name, '')), '');
begin
  if p_product_id is not null then
    return p_product_id;
  end if;

  if v_name is null or public.current_profile_role() not in ('manager', 'executive') then
    return null;
  end if;

  select id into v_product_id
  from public.products
  where lower(name) = lower(v_name)
  limit 1;

  if v_product_id is not null then
    return v_product_id;
  end if;

  insert into public.products (name, default_vendor, default_unit_price, created_by)
  values (v_name, nullif(trim(coalesce(p_vendor, '')), ''), p_unit_price, auth.uid())
  returning id into v_product_id;

  return v_product_id;
end;
$$;

-- Internal helper only — called from the two RPCs below, which are already
-- security-definer and re-check role/name themselves. Not meant to be called directly
-- by the client, so no grant to authenticated, and explicitly revoked from anon/public
-- in case Supabase's default privileges would otherwise expose it.
revoke execute on function public.resolve_product_id(uuid, text, text, numeric) from public;
revoke execute on function public.resolve_product_id(uuid, text, text, numeric) from anon;
revoke execute on function public.resolve_product_id(uuid, text, text, numeric) from authenticated;

-- ============================================================
-- add_wishlist_item — new RPC, replaces the plain `insert into items` the Groceries
-- wishlist form currently does directly (RLS-guarded, items_insert_wish policy). Moving
-- it into a security-definer RPC is what lets a manager/executive's free-typed product
-- name create a catalog row, which a raw client insert under RLS could never do (the
-- products insert policy requires the role check to run as the function owner, not the
-- caller). module is left unset — items.module defaults to 'groceries', matching this
-- form's purpose.
-- ============================================================
create or replace function public.add_wishlist_item(
  p_name         text,
  p_vendor       text,
  p_qty          integer,
  p_unit_price   numeric,
  p_link         text default null,
  p_product_id   uuid default null,
  p_product_name text default null
)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item       public.items;
  v_product_id uuid := public.resolve_product_id(p_product_id, p_product_name, p_vendor, p_unit_price);
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Name is required.';
  end if;
  if p_vendor is null or length(trim(p_vendor)) = 0 then
    raise exception 'Vendor is required.';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantity must be greater than 0.';
  end if;
  if p_unit_price is null or p_unit_price <= 0 then
    raise exception 'Unit price must be greater than 0.';
  end if;

  insert into public.items (
    name, vendor, qty, unit_price, link, product_id,
    status, requested_by, requested_at
  ) values (
    p_name, p_vendor, p_qty, p_unit_price, p_link, v_product_id,
    'wishlist', auth.uid(), now()
  )
  returning * into v_item;

  return v_item;
end;
$$;

grant execute on function public.add_wishlist_item(text, text, integer, numeric, text, uuid, text) to authenticated;

-- ============================================================
-- create_supply_request — dropped and recreated (rather than a trailing-defaults
-- create-or-replace) with the new signature, per explicit request. Every other
-- parameter, and the note-optional / status-by-role / notification behavior, is
-- unchanged from the live definition — verified against pg_get_functiondef() before
-- writing this.
-- ============================================================
drop function if exists public.create_supply_request(text, text, integer, numeric, text, text, item_urgency);

create function public.create_supply_request(
  p_name         text,
  p_vendor       text,
  p_qty          integer,
  p_unit_price   numeric default null,
  p_link         text default null,
  p_note         text default null,
  p_urgency      item_urgency default 'normal',
  p_product_id   uuid default null,
  p_product_name text default null
)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item       public.items;
  v_status     item_status := case when public.current_profile_role() = 'executive'
                                     then 'in_list' else 'pending_approval' end;
  v_product_id uuid := public.resolve_product_id(p_product_id, p_product_name, p_vendor, p_unit_price);
begin
  insert into public.items (
    module, name, vendor, qty, unit_price, link, note, urgency, product_id,
    status, requested_by, requested_at, approved_by, approved_at
  ) values (
    'supplies', p_name, p_vendor, p_qty, p_unit_price, p_link, p_note, p_urgency, v_product_id,
    v_status, auth.uid(), now(),
    case when v_status = 'in_list' then auth.uid() end,
    case when v_status = 'in_list' then now() end
  )
  returning * into v_item;

  if v_status = 'pending_approval' then
    insert into public.notifications (user_id, type, item_id, message)
    select id, 'approval_needed', v_item.id, v_item.name || ' needs your approval.'
    from public.profiles where role = 'executive' and is_active = true;
  end if;

  return v_item;
end;
$$;

grant execute on function public.create_supply_request(text, text, integer, numeric, text, text, item_urgency, uuid, text) to authenticated;
