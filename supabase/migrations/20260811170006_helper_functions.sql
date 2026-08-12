-- Supplies — 0006: helper functions used by RLS policies and RPC functions
-- See PLAN.md §2 (Row-Level Security) for design rationale.

create or replace function public.current_profile_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_budget_amount()
returns numeric
language sql stable security definer set search_path = public
as $$
  select amount from public.budget_settings
  where effective_from <= now()
  order by effective_from desc
  limit 1;
$$;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_budget_amount() to authenticated;
