-- Supplies — 0008: the 1/3 wishlist cap, enforced as a hard DB-level trigger.
-- See PLAN.md §3 for why this must be a trigger and not a CHECK constraint
-- (the rule needs to look at other rows — a staff member's other wishlist items
-- and the current budget — which CHECK constraints cannot query).

create or replace function public.enforce_wishlist_cap()
returns trigger language plpgsql as $$
declare
  requester_role user_role;
  cap    numeric;
  used   numeric;
  total  numeric;
begin
  if new.status <> 'wishlist' then
    return new;  -- cap only applies while sitting in the wishlist
  end if;

  select role into requester_role from public.profiles where id = new.requested_by;
  if requester_role <> 'staff' then
    return new;  -- managers/executives aren't capped
  end if;

  cap   := public.current_budget_amount() / 3;
  total := new.qty * new.unit_price;

  select coalesce(sum(qty * unit_price), 0) into used
  from public.items
  where requested_by = new.requested_by
    and status = 'wishlist'
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if used + total > cap then
    raise exception
      'This exceeds your wishlist allowance ($%.2f of $%.2f used, this item adds $%.2f).',
      used, cap, total;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_wishlist_cap
  before insert or update on public.items
  for each row execute function public.enforce_wishlist_cap();
