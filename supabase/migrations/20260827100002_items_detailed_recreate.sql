-- Feature 3a: Postgres freezes a view's column list at creation time (see 20260814000002's
-- note on this same trick), so items_detailed needs to be dropped and recreated to pick up
-- the new product_id column via i.* — the view's query is otherwise unchanged.

drop view public.items_detailed;

create view public.items_detailed
  with (security_invoker = true) as
select
  i.*,
  (i.qty * i.unit_price) as total,
  req.full_name  as requested_by_name,
  prom.full_name as promoted_by_name,
  ord.full_name  as ordered_by_name,
  chk.full_name  as checked_by_name,
  appr.full_name as approved_by_name,
  rej.full_name  as rejected_by_name,
  can.full_name  as cancelled_by_name
from public.items i
left join public.profiles req  on req.id  = i.requested_by
left join public.profiles prom on prom.id = i.promoted_by
left join public.profiles ord  on ord.id  = i.ordered_by
left join public.profiles chk  on chk.id  = i.checked_by
left join public.profiles appr on appr.id = i.approved_by
left join public.profiles rej  on rej.id  = i.rejected_by
left join public.profiles can  on can.id  = i.cancelled_by;
