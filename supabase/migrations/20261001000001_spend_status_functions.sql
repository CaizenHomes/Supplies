-- One definition of which item statuses count toward spend, replacing the status lists
-- that were inlined separately in spent_this_month(), promote_item(), and app code.
--
--  counts_as_spent        — money has actually left: ordered (a receipt is required to
--                           mark an item ordered) or received.
--  counts_against_budget  — spent, plus in_list (promoted but not yet ordered), so the
--                           monthly budget still reserves room for approved-but-unordered
--                           items and promote_item can't over-commit the month.
--
-- wishlist, pending_approval, rejected, and cancelled count toward neither.

create or replace function public.counts_as_spent(s public.item_status)
returns boolean
language sql immutable
set search_path = ''
as $$
  select s in ('ordered', 'received');
$$;

create or replace function public.counts_against_budget(s public.item_status)
returns boolean
language sql immutable
set search_path = ''
as $$
  select s = 'in_list' or public.counts_as_spent(s);
$$;

-- items_detailed is security_invoker, so the calling (authenticated) user needs EXECUTE
-- on counts_as_spent for the view's new column to evaluate.
revoke execute on function public.counts_as_spent(public.item_status) from public, anon;
revoke execute on function public.counts_against_budget(public.item_status) from public, anon;
grant execute on function public.counts_as_spent(public.item_status) to authenticated;
grant execute on function public.counts_against_budget(public.item_status) to authenticated;

-- Same result as before: status in ('in_list','ordered','received') ⇔ counts_against_budget(status).
create or replace function public.spent_this_month()
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(qty * unit_price), 0)
  from public.items
  where budget_month = date_trunc('month', now())::date
    and public.counts_against_budget(status);
$$;

-- Identical to the live definition except the v_spent status filter.
create or replace function public.promote_item(p_item_id uuid, p_reason text default null)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item   public.items;
  v_total  numeric;
  v_spent  numeric;
  v_budget numeric;
  v_month  date := date_trunc('month', now())::date;
begin
  if public.current_profile_role() not in ('manager','executive') then
    raise exception 'Only managers or executives can move items to the order list.';
  end if;

  select * into v_item from public.items where id = p_item_id and status = 'wishlist' for update;
  if v_item is null then raise exception 'Item not found or not in wishlist.'; end if;

  v_total  := v_item.qty * v_item.unit_price;
  v_budget := public.current_budget_amount();

  select coalesce(sum(qty * unit_price), 0) into v_spent
  from public.items
  where budget_month = v_month and public.counts_against_budget(status);

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

-- Append counts_as_spent as the last column. CREATE OR REPLACE VIEW keeps the view's
-- grants, but replaces its options with whatever this statement specifies, so
-- security_invoker must be restated here or it would be dropped. Columns are listed
-- explicitly (matching the current definition's order) rather than i.*, so the
-- existing column list is reproduced exactly.
create or replace view public.items_detailed
  with (security_invoker = true) as
select
  i.id,
  i.name,
  i.vendor,
  i.link,
  i.qty,
  i.unit_price,
  i.status,
  i.requested_by,
  i.requested_at,
  i.promoted_by,
  i.promoted_at,
  i.budget_month,
  i.over_budget_reason,
  i.approved_by,
  i.approved_at,
  i.rejected_by,
  i.rejected_at,
  i.ordered_by,
  i.ordered_at,
  i.receipt_path,
  i.checked_by,
  i.checked_at,
  i.cancelled_by,
  i.cancelled_at,
  i.cancellation_reason,
  i.created_at,
  i.updated_at,
  i.module,
  i.urgency,
  i.note,
  i.product_id,
  (i.qty * i.unit_price) as total,
  req.full_name  as requested_by_name,
  prom.full_name as promoted_by_name,
  ord.full_name  as ordered_by_name,
  chk.full_name  as checked_by_name,
  appr.full_name as approved_by_name,
  rej.full_name  as rejected_by_name,
  can.full_name  as cancelled_by_name,
  public.counts_as_spent(i.status) as counts_as_spent
from public.items i
left join public.profiles req  on req.id  = i.requested_by
left join public.profiles prom on prom.id = i.promoted_by
left join public.profiles ord  on ord.id  = i.ordered_by
left join public.profiles chk  on chk.id  = i.checked_by
left join public.profiles appr on appr.id = i.approved_by
left join public.profiles rej  on rej.id  = i.rejected_by
left join public.profiles can  on can.id  = i.cancelled_by;
