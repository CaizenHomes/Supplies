-- Supplies — spent_this_month(): mirrors the exact "already spent this month" computation
-- used inside promote_item, so every page that previews budget impact (wishlist promote
-- modal, approvals) reads the identical number Postgres itself uses, with no timezone
-- drift from computing month boundaries in application code.
create or replace function public.spent_this_month()
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(qty * unit_price), 0)
  from public.items
  where budget_month = date_trunc('month', now())::date
    and status in ('in_list', 'ordered', 'received');
$$;

grant execute on function public.spent_this_month() to authenticated;
