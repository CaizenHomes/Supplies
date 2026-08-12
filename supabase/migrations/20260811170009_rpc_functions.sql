-- Supplies — 0009: RPC functions for every item state transition.
-- See PLAN.md §3 for why these are security-definer functions rather than raw
-- client UPDATEs: each transition has to recompute spend, decide the correct
-- target status itself, stamp required fields, and fire notifications atomically.
-- The frontend should call these via supabase.rpc(...) instead of writing to
-- items directly for any state change.

-- ============================================================
-- promote_item — wishlist -> in_list or pending_approval
-- ============================================================
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
  where budget_month = v_month and status in ('in_list','ordered','received');

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

-- ============================================================
-- approve_item — pending_approval -> in_list (executive only)
-- ============================================================
create or replace function public.approve_item(p_item_id uuid)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.items;
begin
  if public.current_profile_role() <> 'executive' then
    raise exception 'Only an executive can approve items.';
  end if;

  update public.items set
    status = 'in_list', approved_by = auth.uid(), approved_at = now(), updated_at = now()
  where id = p_item_id and status = 'pending_approval'
  returning * into v_item;

  if v_item is null then
    raise exception 'Item not found or not pending approval.';
  end if;

  insert into public.notifications (user_id, type, item_id, message)
  values (
    v_item.requested_by, 'wish_promoted', v_item.id,
    v_item.name || ' was approved and added to the order list.'
  );

  return v_item;
end;
$$;

-- ============================================================
-- reject_item — pending_approval -> rejected (executive only, terminal)
-- ============================================================
create or replace function public.reject_item(p_item_id uuid)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.items;
begin
  if public.current_profile_role() <> 'executive' then
    raise exception 'Only an executive can reject items.';
  end if;

  update public.items set
    status = 'rejected', rejected_by = auth.uid(), rejected_at = now(), updated_at = now()
  where id = p_item_id and status = 'pending_approval'
  returning * into v_item;

  if v_item is null then
    raise exception 'Item not found or not pending approval.';
  end if;

  -- No notification fired here: rejection isn't one of the three defined notification
  -- types. The requester will see the rejected status directly in History (staff have
  -- full read access) and can resubmit as a fresh wish if they want.

  return v_item;
end;
$$;

-- ============================================================
-- mark_ordered — in_list -> ordered (manager/executive, requires a receipt)
-- ============================================================
create or replace function public.mark_ordered(p_item_id uuid, p_receipt_path text)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.items;
begin
  if public.current_profile_role() not in ('manager','executive') then
    raise exception 'Only managers or executives can mark items ordered.';
  end if;

  if p_receipt_path is null or length(trim(p_receipt_path)) = 0 then
    raise exception 'A receipt must be attached.';
  end if;

  update public.items set
    status = 'ordered', ordered_by = auth.uid(), ordered_at = now(),
    receipt_path = p_receipt_path, updated_at = now()
  where id = p_item_id and status = 'in_list'
  returning * into v_item;

  if v_item is null then
    raise exception 'Item not found or not in the order list.';
  end if;

  -- p_receipt_path should already point at a file the caller just uploaded to the
  -- 'receipts' storage bucket (see storage.objects policies in 0010) — this function
  -- only records the path, it does not touch Storage itself.

  return v_item;
end;
$$;

-- ============================================================
-- mark_received — ordered -> received (manager/executive, terminal)
-- ============================================================
create or replace function public.mark_received(p_item_id uuid, p_checked_by uuid)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.items;
begin
  if public.current_profile_role() not in ('manager','executive') then
    raise exception 'Only managers or executives can mark items received.';
  end if;

  -- p_checked_by is whoever physically verified the delivery — may or may not be the caller.
  if not exists (select 1 from public.profiles where id = p_checked_by and is_active) then
    raise exception 'checked_by must be an active user.';
  end if;

  update public.items set
    status = 'received', checked_by = p_checked_by, checked_at = now(), updated_at = now()
  where id = p_item_id and status = 'ordered'
  returning * into v_item;

  if v_item is null then
    raise exception 'Item not found or not ordered.';
  end if;

  insert into public.notifications (user_id, type, item_id, message)
  values (v_item.requested_by, 'item_received', v_item.id, v_item.name || ' was received and verified.');

  return v_item;
end;
$$;

-- ============================================================
-- cancel_item — in_list or ordered -> cancelled (manager/executive, terminal)
-- ============================================================
create or replace function public.cancel_item(p_item_id uuid, p_reason text default null)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.items;
begin
  if public.current_profile_role() not in ('manager','executive') then
    raise exception 'Only managers or executives can cancel items.';
  end if;

  update public.items set
    status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now(),
    cancellation_reason = p_reason, updated_at = now()
  where id = p_item_id and status in ('in_list','ordered')
  returning * into v_item;

  if v_item is null then
    raise exception 'Item not found or not cancellable (must be in_list or ordered).';
  end if;

  -- No notification fired here: cancellation isn't one of the three defined
  -- notification types. Staff will see the cancelled status directly in History.

  return v_item;
end;
$$;

-- ============================================================
-- Grants — security definer functions still need an explicit EXECUTE grant
-- to the role that will call them. Every function checks current_profile_role()
-- internally, so granting to all authenticated users is safe: an unauthorized
-- caller's request fails inside the function with a clear error, it never
-- reaches an unguarded UPDATE.
-- ============================================================
grant execute on function public.promote_item(uuid, text)   to authenticated;
grant execute on function public.approve_item(uuid)         to authenticated;
grant execute on function public.reject_item(uuid)          to authenticated;
grant execute on function public.mark_ordered(uuid, text)   to authenticated;
grant execute on function public.mark_received(uuid, uuid)  to authenticated;
grant execute on function public.cancel_item(uuid, text)    to authenticated;
