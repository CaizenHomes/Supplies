-- Monthly budget counts by order date, in Pacific time.
--
--  * ordered / received items (counts_as_spent) count toward the America/Vancouver month
--    of ordered_at, the month the money actually left.
--  * in_list items (counts_against_budget but not yet spent) keep counting toward their
--    budget_month, so the budget still reserves room for approved-but-unordered items.
--  * An order's GST/PST counts toward the latest effective month among its counted items.
--
-- budget_month on existing rows is not changed; the effective month is computed here.
-- Items are limited to Groceries: Supplies is budget-free and was only excluded before
-- because its rows never get a budget_month, but they do get ordered_at.

create or replace function public.budget_spent(p_month date)
returns numeric
language sql stable security definer set search_path = public
as $$
  with counted as (
    select
      receipt_path,
      qty,
      unit_price,
      case
        when public.counts_as_spent(status)
          then date_trunc('month', ordered_at at time zone 'America/Vancouver')::date
        else budget_month
      end as effective_month
    from public.items
    where module = 'groceries'
      and public.counts_against_budget(status)
  )
  select
    coalesce((
      select sum(qty * unit_price)
      from counted
      where effective_month = p_month
    ), 0)
    +
    coalesce((
      select sum(coalesce(t.gst, 0) + coalesce(t.pst, 0))
      from public.order_taxes t
      join (
        select receipt_path, max(effective_month) as order_month
        from counted
        where receipt_path is not null
        group by receipt_path
      ) o on o.receipt_path = t.receipt_path
      where o.order_month = p_month
    ), 0);
$$;

-- Budget bar: current month in Pacific time.
create or replace function public.spent_this_month()
returns numeric
language sql stable security definer set search_path = public
as $$
  select public.budget_spent(date_trunc('month', now() at time zone 'America/Vancouver')::date);
$$;

-- Identical to the live definition except v_month, which is now the Pacific-time month.
create or replace function public.promote_item(p_item_id uuid, p_reason text default null)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item   public.items;
  v_total  numeric;
  v_spent  numeric;
  v_budget numeric;
  v_month  date := date_trunc('month', now() at time zone 'America/Vancouver')::date;
begin
  if public.current_profile_role() not in ('manager','executive') then
    raise exception 'Only managers or executives can move items to the order list.';
  end if;

  select * into v_item from public.items where id = p_item_id and status = 'wishlist' for update;
  if v_item is null then raise exception 'Item not found or not in wishlist.'; end if;

  v_total  := v_item.qty * v_item.unit_price;
  v_budget := public.current_budget_amount();

  v_spent := public.budget_spent(v_month);

  if (v_spent + v_total) > v_budget then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'A reason is required when promoting an over-budget item.';
    end if;

    update public.items set
      status = 'pending_approval', promoted_by = auth.uid(), promoted_at = now(),
      budget_month = v_month, over_budget_reason = p_reason, updated_at = now()
    where id = p_item_id returning * into v_item;

    insert into public.notifications (user_id, type, item_id, message)
    select id, 'approval_needed', v_item.id, v_item.name || ' needs your approval (over budget).'
    from public.profiles where role = 'executive' and is_active = true;
  else
    update public.items set
      status = 'in_list', promoted_by = auth.uid(), promoted_at = now(),
      budget_month = v_month, updated_at = now()
    where id = p_item_id returning * into v_item;

    insert into public.notifications (user_id, type, item_id, message)
    values (v_item.requested_by, 'wish_promoted', v_item.id, v_item.name || ' was moved to the order list.');
  end if;

  return v_item;
end;
$$;
