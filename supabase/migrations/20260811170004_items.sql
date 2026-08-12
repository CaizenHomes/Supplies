-- Supplies — 0004: items table (full lifecycle), indexes, updated_at trigger,
-- and the items_detailed convenience view.
-- See PLAN.md §1 (Schema) for design rationale.

-- ============================================================
-- ITEMS — full lifecycle
-- ============================================================
create table public.items (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  vendor                text not null,
  link                  text,
  qty                   integer not null check (qty > 0),
  unit_price            numeric(10,2) not null check (unit_price > 0),
  status                item_status not null default 'wishlist',

  requested_by          uuid not null references public.profiles(id),
  requested_at          timestamptz not null default now(),

  promoted_by           uuid references public.profiles(id),
  promoted_at           timestamptz,
  budget_month          date,          -- first-of-month stamp set at promotion; see PLAN.md §4
  over_budget_reason    text,

  approved_by           uuid references public.profiles(id),
  approved_at           timestamptz,

  rejected_by           uuid references public.profiles(id),
  rejected_at           timestamptz,

  ordered_by            uuid references public.profiles(id),
  ordered_at            timestamptz,
  receipt_path          text,          -- storage key in the 'receipts' bucket, not a file

  checked_by            uuid references public.profiles(id),
  checked_at            timestamptz,

  cancelled_by          uuid references public.profiles(id),
  cancelled_at          timestamptz,
  cancellation_reason   text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- same-row defense-in-depth: a status can't exist without its required companion fields,
  -- even if something bypassed the RPC functions in 0009 and wrote raw SQL.
  constraint items_status_requirements check (
    (status <> 'pending_approval' or (over_budget_reason is not null and length(trim(over_budget_reason)) > 0))
    and (status <> 'ordered'  or (receipt_path is not null and ordered_by is not null and ordered_at is not null))
    and (status <> 'received' or (checked_by is not null and checked_at is not null))
    and (status <> 'rejected' or (rejected_by is not null and rejected_at is not null))
    and (status <> 'cancelled' or (cancelled_by is not null and cancelled_at is not null))
  )
);

create index items_status_idx on public.items(status);
create index items_requested_by_idx on public.items(requested_by);
create index items_budget_month_idx on public.items(budget_month);

create trigger trg_items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

-- ============================================================
-- Convenience view for the UI / CSV export (joins names in)
-- ============================================================
create view public.items_detailed
  with (security_invoker = true) as
select
  i.*,
  (i.qty * i.unit_price)      as total,
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
