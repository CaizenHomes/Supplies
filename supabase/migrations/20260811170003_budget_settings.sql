-- Supplies — 0003: budget_settings table
-- See PLAN.md §1 (Schema) and §4 (monthly reset explanation) for design rationale.

-- ============================================================
-- BUDGET_SETTINGS — append-only, effective-dated history.
-- "Current budget" = the row with the latest effective_from <= now().
-- Changing the budget = inserting a new row, never editing an old one.
-- ============================================================
create table public.budget_settings (
  id              uuid primary key default gen_random_uuid(),
  amount          numeric(10,2) not null check (amount > 0),
  effective_from  timestamptz not null default now(),
  set_by          uuid not null references public.profiles(id),
  created_at      timestamptz not null default now()
);
