-- One-time backfill: seed the products catalog from historical items that were created
-- before Feature 3a's product-aware RPCs existed, so the catalog isn't just whatever the
-- combobox happened to create since deploy. For each unique (case-insensitive) item name,
-- take the vendor/unit_price off the *most recently requested* item with that name as the
-- product's defaults. Skips any name that already has a product (dedup) — notably this
-- leaves the "ki" test product alone; that gets cleaned up separately.
with latest_by_name as (
  select distinct on (lower(name))
    name, vendor, unit_price
  from public.items
  order by lower(name), requested_at desc, created_at desc
)
insert into public.products (name, default_vendor, default_unit_price)
select l.name, l.vendor, l.unit_price
from latest_by_name l
where not exists (
  select 1 from public.products p where lower(p.name) = lower(l.name)
);

-- Link every item to its matching product by name, wherever it isn't linked already.
-- Only touches product_id IS NULL rows, so anything already linked (e.g. items added
-- through the combobox since deploy) is left alone.
update public.items i
set product_id = p.id
from public.products p
where i.product_id is null
  and lower(i.name) = lower(p.name);
