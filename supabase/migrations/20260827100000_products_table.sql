-- Feature 3a: Products catalog — the shared reference list of "things we buy" that
-- Feature 3b's barcode scanning will look up against. Managers/executives curate it
-- (create/edit); everyone can read it, since the autocomplete on both the Groceries
-- wishlist and Supplies request forms needs to query it regardless of the caller's role.

create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  barcode            text unique,
  name               text not null,
  default_vendor     text,
  default_unit_price numeric(10,2),
  category           text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles(id)
);

-- Speeds up the case-insensitive exact-name dedupe lookup the add_wishlist_item /
-- create_supply_request RPCs do before creating a new product. Not needed for the
-- typeahead's `ilike '%term%'` search — the catalog is small enough for a seq scan there.
create index products_name_lower_idx on public.products (lower(name));

create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

create policy products_select_all on public.products
  for select to authenticated using (true);

create policy products_insert_manager on public.products
  for insert to authenticated
  with check (public.current_profile_role() in ('manager','executive'));

create policy products_update_manager on public.products
  for update to authenticated
  using (public.current_profile_role() in ('manager','executive'))
  with check (public.current_profile_role() in ('manager','executive'));

-- No delete policy — products are never removed via the app; an unused one just sits
-- there, matching how items are never hard-deleted once they leave the wishlist.
