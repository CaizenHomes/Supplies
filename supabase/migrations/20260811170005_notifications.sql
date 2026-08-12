-- Supplies — 0005: notifications table
-- See PLAN.md §1 (Schema) for design rationale.

-- ============================================================
-- NOTIFICATIONS — in-app only, system-generated (see 0009 RPC functions)
-- ============================================================
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        notification_type not null,
  item_id     uuid references public.items(id) on delete cascade,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index notifications_unread_idx on public.notifications(user_id) where is_read = false;
