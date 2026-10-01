-- Optional order-level GST/PST for Groceries, so order totals match receipts.
--
-- There is no orders table: an order is the set of items sharing a receipt_path (see
-- lib/receipt-groups.ts), so taxes are keyed by receipt_path. NULL gst/pst means $0.
-- Item rows and per-item totals are untouched; tax only exists at the order level.

-- ============================================================
-- receipt_path is the order's identity, so it must never change once set.
-- Only mark_ordered / mark_ordered_batch write it, and only on in_list items whose path
-- is still null. Nothing in the app changes or clears it afterwards, but the
-- items_update_manager RLS policy would let a manager/executive rewrite it on an
-- ordered row via a raw API UPDATE, which would orphan that order's tax row. This
-- trigger closes that gap. A future "replace receipt" feature must go through an RPC
-- that moves the order_taxes row in the same transaction (and relaxes this guard).
-- ============================================================
create or replace function public.prevent_receipt_path_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.receipt_path is not null and new.receipt_path is distinct from old.receipt_path then
    raise exception 'An item''s receipt cannot be changed once it has been ordered.';
  end if;
  return new;
end;
$$;

create trigger trg_items_receipt_path_immutable
  before update of receipt_path on public.items
  for each row execute function public.prevent_receipt_path_change();

-- ============================================================
-- ORDER_TAXES
-- ============================================================
create table public.order_taxes (
  id            uuid primary key default gen_random_uuid(),
  receipt_path  text not null unique,
  gst           numeric(10,2) check (gst >= 0),
  pst           numeric(10,2) check (pst >= 0),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles(id)   -- audit only, never displayed
);

-- Audit fields are stamped server-side, never trusted from the client.
create or replace function public.stamp_order_taxes()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create trigger trg_order_taxes_stamp
  before insert or update on public.order_taxes
  for each row execute function public.stamp_order_taxes();

alter table public.order_taxes enable row level security;

-- Read: anyone who can read at least one item on that receipt. Today that is every
-- authenticated user (items_select_all is using(true)); expressing it through items
-- means it follows any future tightening of item visibility automatically.
create policy order_taxes_select on public.order_taxes
  for select to authenticated
  using (exists (select 1 from public.items i where i.receipt_path = order_taxes.receipt_path));

-- Write: the roles that can mark items ordered (mark_ordered / mark_ordered_batch require
-- manager or executive), and only for a receipt that belongs to Groceries items.
create policy order_taxes_insert on public.order_taxes
  for insert to authenticated
  with check (
    public.current_profile_role() in ('manager', 'executive')
    and exists (select 1 from public.items i
                where i.receipt_path = order_taxes.receipt_path and i.module = 'groceries')
  );

create policy order_taxes_update on public.order_taxes
  for update to authenticated
  using (public.current_profile_role() in ('manager', 'executive'))
  with check (
    public.current_profile_role() in ('manager', 'executive')
    and exists (select 1 from public.items i
                where i.receipt_path = order_taxes.receipt_path and i.module = 'groceries')
  );

-- No delete policy: clearing tax means setting gst/pst back to null.

revoke all on public.order_taxes from anon, authenticated;
grant select, insert, update on public.order_taxes to authenticated;

-- ============================================================
-- budget_spent(month) — the single "budget used in a month" calculation, shared by the
-- budget bar (spent_this_month) and promote_item's over-budget check so they can never
-- disagree. The item sum is exactly the previous calculation; tax is added per order.
--
-- An order's tax counts if at least one of its items still counts against budget (an
-- all-cancelled/rejected order produces no row in the subquery, so its tax drops out;
-- a partially cancelled order keeps its full tax). An order's budget month is the
-- latest budget_month among its counting items — never earlier than any item on the
-- receipt, and the promotion month closest to when the receipt was paid.
-- ============================================================
create or replace function public.budget_spent(p_month date)
returns numeric
language sql stable security definer set search_path = public
as $$
  select
    coalesce((
      select sum(qty * unit_price)
      from public.items
      where budget_month = p_month and public.counts_against_budget(status)
    ), 0)
    +
    coalesce((
      select sum(coalesce(t.gst, 0) + coalesce(t.pst, 0))
      from public.order_taxes t
      join (
        select receipt_path, max(budget_month) as order_month
        from public.items
        where module = 'groceries'
          and receipt_path is not null
          and public.counts_against_budget(status)
        group by receipt_path
      ) o on o.receipt_path = t.receipt_path
      where o.order_month = p_month
    ), 0);
$$;

revoke execute on function public.budget_spent(date) from public, anon;
grant execute on function public.budget_spent(date) to authenticated;

-- Budget bar. Same attributes as before; body now delegates to budget_spent.
create or replace function public.spent_this_month()
returns numeric
language sql stable security definer set search_path = public
as $$
  select public.budget_spent(date_trunc('month', now())::date);
$$;

-- Identical to the live definition except v_spent, which now comes from budget_spent so
-- it includes already-entered order tax and matches the budget bar. It does not
-- estimate tax for the item being promoted.
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
