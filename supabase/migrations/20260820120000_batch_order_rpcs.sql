-- Supplies — 0018: batch versions of mark_ordered/mark_received for the new group-ordering
-- UI on /groceries/orders and /supplies/orders. Existing single-item mark_ordered/mark_received
-- (0009) are untouched and still power the per-item buttons; these cover the "select N rows,
-- one receipt / one verifier" bulk action bar.

-- ============================================================
-- mark_ordered_batch — in_list -> ordered for N items, one shared receipt, one transaction.
-- ============================================================
create or replace function public.mark_ordered_batch(p_item_ids uuid[], p_receipt_path text)
returns setof public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
begin
  if public.current_profile_role() not in ('manager','executive') then
    raise exception 'Only managers or executives can mark items ordered.';
  end if;

  if p_receipt_path is null or length(trim(p_receipt_path)) = 0 then
    raise exception 'A receipt must be attached.';
  end if;

  if p_item_ids is null or array_length(p_item_ids, 1) is null then
    raise exception 'No items selected.';
  end if;

  -- All-or-nothing: abort the whole batch rather than partially applying if the
  -- selection went stale (e.g. someone else already ordered one of them).
  select count(*) into v_count from public.items where id = any(p_item_ids) and status = 'in_list';
  if v_count <> array_length(p_item_ids, 1) then
    raise exception 'One or more selected items are no longer in the order list.';
  end if;

  return query
    update public.items set
      status = 'ordered', ordered_by = auth.uid(), ordered_at = now(),
      receipt_path = p_receipt_path, updated_at = now()
    where id = any(p_item_ids) and status = 'in_list'
    returning *;
end;
$$;

grant execute on function public.mark_ordered_batch(uuid[], text) to authenticated;
revoke execute on function public.mark_ordered_batch(uuid[], text) from public;
revoke execute on function public.mark_ordered_batch(uuid[], text) from anon;

-- ============================================================
-- mark_received_batch — ordered -> received for N items, one verifier, one transaction.
-- ============================================================
create or replace function public.mark_received_batch(p_item_ids uuid[], p_checked_by uuid)
returns setof public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
begin
  if public.current_profile_role() not in ('manager','executive') then
    raise exception 'Only managers or executives can mark items received.';
  end if;

  if not exists (select 1 from public.profiles where id = p_checked_by and is_active) then
    raise exception 'checked_by must be an active user.';
  end if;

  if p_item_ids is null or array_length(p_item_ids, 1) is null then
    raise exception 'No items selected.';
  end if;

  select count(*) into v_count from public.items where id = any(p_item_ids) and status = 'ordered';
  if v_count <> array_length(p_item_ids, 1) then
    raise exception 'One or more selected items are no longer awaiting receipt.';
  end if;

  insert into public.notifications (user_id, type, item_id, message)
  select requested_by, 'item_received', id, name || ' was received and verified.'
  from public.items where id = any(p_item_ids) and status = 'ordered';

  return query
    update public.items set
      status = 'received', checked_by = p_checked_by, checked_at = now(), updated_at = now()
    where id = any(p_item_ids) and status = 'ordered'
    returning *;
end;
$$;

grant execute on function public.mark_received_batch(uuid[], uuid) to authenticated;
revoke execute on function public.mark_received_batch(uuid[], uuid) from public;
revoke execute on function public.mark_received_batch(uuid[], uuid) from anon;
