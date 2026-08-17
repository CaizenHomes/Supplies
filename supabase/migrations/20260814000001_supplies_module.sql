-- Supplies module: adds a second, budget-free item flow onto the existing items table.
-- Groceries keeps its wishlist -> promote -> (approve) -> order -> receive lifecycle untouched.
-- Supplies skips the wishlist tier: every request lands in pending_approval directly (or,
-- if an executive submits it themselves, straight into in_list) via create_supply_request().

create type item_module as enum ('groceries', 'supplies');
create type item_urgency as enum ('normal', 'urgent');

alter table public.items
  add column module  item_module not null default 'groceries',
  add column urgency item_urgency,
  add column note    text;

-- Supplies allows an unpriced estimate (client-side validation still requires a price for
-- Groceries wishes); relaxing this at the table level doesn't change Groceries behavior.
alter table public.items alter column unit_price drop not null;
alter table public.items drop constraint if exists items_unit_price_check;
alter table public.items add constraint items_unit_price_check
  check (unit_price is null or unit_price > 0);

-- over_budget_reason is a Groceries-only requirement for pending_approval; Supplies
-- pending_approval is the default first state, not an over-budget exception.
alter table public.items drop constraint items_status_requirements;
alter table public.items add constraint items_status_requirements check (
  (status <> 'pending_approval' or module = 'supplies'
    or (over_budget_reason is not null and length(trim(over_budget_reason)) > 0))
  and (status <> 'ordered'  or (receipt_path is not null and ordered_by is not null and ordered_at is not null))
  and (status <> 'received' or (checked_by is not null and checked_at is not null))
  and (status <> 'rejected' or (rejected_by is not null and rejected_at is not null))
  and (status <> 'cancelled' or (cancelled_by is not null and cancelled_at is not null))
);

create index items_module_idx on public.items(module);

-- ============================================================
-- create_supply_request — the Supplies equivalent of "add wish". The target status
-- depends on the requester's role (executives self-approve), so this has to be a
-- security-definer RPC rather than a plain client insert, mirroring how promote_item
-- already decides in_list vs pending_approval for Groceries rather than trusting
-- whatever status the client claims.
-- ============================================================
create or replace function public.create_supply_request(
  p_name       text,
  p_vendor     text,
  p_qty        integer,
  p_unit_price numeric default null,
  p_link       text default null,
  p_note       text default null,
  p_urgency    item_urgency default 'normal'
)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item   public.items;
  v_status item_status := case when public.current_profile_role() = 'executive'
                                then 'in_list' else 'pending_approval' end;
begin
  insert into public.items (
    module, name, vendor, qty, unit_price, link, note, urgency,
    status, requested_by, requested_at, approved_by, approved_at
  ) values (
    'supplies', p_name, p_vendor, p_qty, p_unit_price, p_link, p_note, p_urgency,
    v_status, auth.uid(), now(),
    case when v_status = 'in_list' then auth.uid() end,
    case when v_status = 'in_list' then now() end
  )
  returning * into v_item;

  if v_status = 'pending_approval' then
    insert into public.notifications (user_id, type, item_id, message)
    select id, 'approval_needed', v_item.id, v_item.name || ' needs your approval.'
    from public.profiles where role = 'executive' and is_active = true;
  end if;

  return v_item;
end;
$$;

grant execute on function public.create_supply_request(text, text, integer, numeric, text, text, item_urgency) to authenticated;

-- ============================================================
-- cancel_item — extended to also cover withdrawing a pending Supplies request.
-- Previously this only handled in_list/ordered -> cancelled for managers/executives.
-- Now a Supplies request sitting in pending_approval can be withdrawn (as `cancelled`,
-- never deleted, per the "history forever" design) by the requester themselves or by
-- a manager/executive. Groceries pending_approval items are untouched — those still
-- only move via approve_item/reject_item.
-- ============================================================
create or replace function public.cancel_item(p_item_id uuid, p_reason text default null)
returns public.items
language plpgsql security definer set search_path = public
as $$
declare
  v_item public.items;
  v_role user_role := public.current_profile_role();
begin
  select * into v_item from public.items where id = p_item_id for update;
  if v_item is null then
    raise exception 'Item not found.';
  end if;

  if v_item.status = 'pending_approval' then
    if v_item.module <> 'supplies' then
      raise exception 'Groceries requests pending approval can only be approved or rejected, not withdrawn.';
    end if;
    if not (v_item.requested_by = auth.uid() or v_role in ('manager', 'executive')) then
      raise exception 'Only the requester or a manager/executive can withdraw this request.';
    end if;
  elsif v_item.status in ('in_list', 'ordered') then
    if v_role not in ('manager', 'executive') then
      raise exception 'Only managers or executives can cancel items.';
    end if;
  else
    raise exception 'Item not found or not cancellable (must be pending_approval, in_list, or ordered).';
  end if;

  update public.items set
    status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now(),
    cancellation_reason = p_reason, updated_at = now()
  where id = p_item_id
  returning * into v_item;

  -- Drop the item's outstanding approval-needed ping from the executive's queue so a
  -- withdrawn request doesn't linger as an unread notification for something now moot.
  update public.notifications
  set is_read = true
  where item_id = p_item_id and type = 'approval_needed' and is_read = false;

  return v_item;
end;
$$;

-- Signature is unchanged from the original cancel_item(uuid, text), so the existing grant
-- from migration 20260811170009 already covers this replacement.
