-- Feature 3a: links items to the shared products catalog. Nullable and no backfill —
-- historical items, and anything staff enter as plain free text, stay unlinked forever.

alter table public.items
  add column product_id uuid references public.products(id);

create index items_product_id_idx on public.items(product_id);
