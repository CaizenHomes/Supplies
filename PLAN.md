# Supplies — Database & Security Design Plan

Internal grocery/supplies ordering tool for Caizen Homes. Three roles: **executive**, **manager**, **staff**.
This document is the reviewed design — schema, RLS policies, enforcement functions, and the monthly-reset
mechanism — before any of it is applied to a real Supabase project.

## Assumptions made during design — confirmed 2026-08-12

1. **Confirmed.** Executives inherit manager abilities (can also promote/order/receive/cancel items), since
   the role spec didn't say executives are blocked from it, and a 9-person team shouldn't stall if the one
   manager on duty is out. RLS below reflects this.
2. **Confirmed.** Managers and executives can also add plain, uncapped wishlist items themselves — matching
   the prototype, where "+ Add wish" wasn't role-gated. Only staff have the 1/3 cap.
3. **Confirmed.** Rejected/cancelled items are never deleted — they just sit in `items` with a terminal
   status, which alone satisfies "history forever" and serves as the audit trail.

## Confirmed requirements this design implements

- Admin/Executive invites by email, no self-signup. One role per person. Executive-only role changes.
- Login via magic link (Supabase Auth), no passwords.
- One company-wide wishlist and budget. Single-tenant.
- 1/3-of-budget wishlist cap per staff member, enforced both client-side and as a hard DB constraint.
- Budget auto-carries-forward each month; a mid-month change applies from that point forward, not
  retroactively. No rollover of unspent funds.
- Rejected items stay in history forever; staff can resubmit as a fresh wish.
- Approval is a one-way gate for the initial over-budget case only. Managers can cancel `in_list`/`ordered`
  items later if plans change; cancelled items go to history with a `cancelled` status.
- Receipts stored as real files in Supabase Storage, not just filenames.
- Any manager can mark an item received, but must record who physically verified delivery.
- Managers can edit/cancel `in_list`/`ordered` items (price/vendor changes happen in real life).
- In-app notifications only for v1: wish promoted, approval needed, order received.
- Staff have full read-only visibility into the order list and history (transparency for the whole team).
- Unfulfilled `in_list` items and unapproved `pending_approval` items carry over to the next month
  automatically (nothing expires them).
- CSV export from History, for the Executive.
- No fourth view-only role for now.

---

## 1. Schema

```sql
create extension if not exists pgcrypto;

create type user_role as enum ('executive','manager','staff');

create type item_status as enum (
  'wishlist', 'pending_approval', 'in_list', 'ordered', 'received', 'rejected', 'cancelled'
);

create type notification_type as enum (
  'wish_promoted', 'approval_needed', 'item_received'
);

-- ============================================================
-- PROFILES — one row per auth.users row
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null unique,
  role         user_role not null default 'staff',
  is_active    boolean not null default true,
  invited_by   uuid references public.profiles(id),   -- null for the first executive
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

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

-- ============================================================
-- ITEMS — full lifecycle
-- ============================================================
create table public.items (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  vendor                text not null,
  link                  text,
  qty                   integer not null check (qty > 0),
  unit_price            numeric(10,2) not null check (unit_price > 0),
  status                item_status not null default 'wishlist',

  requested_by          uuid not null references public.profiles(id),
  requested_at          timestamptz not null default now(),

  promoted_by           uuid references public.profiles(id),
  promoted_at           timestamptz,
  budget_month          date,          -- first-of-month stamp set at promotion; see reset explanation below
  over_budget_reason    text,

  approved_by           uuid references public.profiles(id),
  approved_at           timestamptz,

  rejected_by           uuid references public.profiles(id),
  rejected_at           timestamptz,

  ordered_by            uuid references public.profiles(id),
  ordered_at            timestamptz,
  receipt_path          text,          -- storage key in the 'receipts' bucket, not a file

  checked_by            uuid references public.profiles(id),
  checked_at            timestamptz,

  cancelled_by          uuid references public.profiles(id),
  cancelled_at          timestamptz,
  cancellation_reason   text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- same-row defense-in-depth: a status can't exist without its required companion fields,
  -- even if something bypassed the RPC functions below and wrote raw SQL.
  constraint items_status_requirements check (
    (status <> 'pending_approval' or (over_budget_reason is not null and length(trim(over_budget_reason)) > 0))
    and (status <> 'ordered'  or (receipt_path is not null and ordered_by is not null and ordered_at is not null))
    and (status <> 'received' or (checked_by is not null and checked_at is not null))
    and (status <> 'rejected' or (rejected_by is not null and rejected_at is not null))
    and (status <> 'cancelled' or (cancelled_by is not null and cancelled_at is not null))
  )
);

create index items_status_idx on public.items(status);
create index items_requested_by_idx on public.items(requested_by);
create index items_budget_month_idx on public.items(budget_month);

-- ============================================================
-- NOTIFICATIONS — in-app only, system-generated (see RPC functions)
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

-- ============================================================
-- updated_at housekeeping
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_items_updated_at before update on public.items
  for each row execute function public.set_updated_at();
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- Auto-provision a profile row when the Executive invites someone
-- (Supabase's inviteUserByEmail creates the auth.users row; this
-- fills in profiles from the metadata the invite call passed).
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Convenience view for the UI / CSV export (joins names in)
-- ============================================================
create view public.items_detailed
  with (security_invoker = true) as
select
  i.*,
  (i.qty * i.unit_price)      as total,
  req.full_name  as requested_by_name,
  prom.full_name as promoted_by_name,
  ord.full_name  as ordered_by_name,
  chk.full_name  as checked_by_name,
  appr.full_name as approved_by_name,
  rej.full_name  as rejected_by_name,
  can.full_name  as cancelled_by_name
from public.items i
left join public.profiles req  on req.id  = i.requested_by
left join public.profiles prom on prom.id = i.promoted_by
left join public.profiles ord  on ord.id  = i.ordered_by
left join public.profiles chk  on chk.id  = i.checked_by
left join public.profiles appr on appr.id = i.approved_by
left join public.profiles rej  on rej.id  = i.rejected_by
left join public.profiles can  on can.id  = i.cancelled_by;
```

---

## 2. Row-Level Security

```sql
alter table public.profiles enable row level security;
alter table public.budget_settings enable row level security;
alter table public.items enable row level security;
alter table public.notifications enable row level security;

-- Helper used throughout the policies below
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
```

### profiles

| op | executive | manager | staff |
|---|---|---|---|
| select | all rows | all rows | all rows |
| insert | — (via trigger only) | — | — |
| update | any row, any column | own row, name only | own row, name only |
| delete | none | none | none |

```sql
create policy profiles_select_all on public.profiles
  for select to authenticated using (true);

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and is_active = (select is_active from public.profiles where id = auth.uid())
  );

create policy profiles_update_executive on public.profiles
  for update to authenticated
  using (public.current_profile_role() = 'executive')
  with check (public.current_profile_role() = 'executive');

-- Safety net: an executive can't lock the company out by demoting/deactivating themselves
-- if they're the only one left.
create or replace function public.prevent_last_executive_removal()
returns trigger language plpgsql as $$
begin
  if old.role = 'executive' and (new.role <> 'executive' or new.is_active = false) then
    if (select count(*) from public.profiles
        where role = 'executive' and is_active = true and id <> old.id) = 0 then
      raise exception 'Cannot remove the last active executive.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_last_executive
  before update on public.profiles
  for each row execute function public.prevent_last_executive_removal();

-- No INSERT or DELETE policy exists → both are denied by default for the authenticated role.
```

### budget_settings

| op | executive | manager | staff |
|---|---|---|---|
| select | all | all | all |
| insert | yes (as themselves) | — | — |
| update | — | — | — |
| delete | — | — | — |

```sql
create policy budget_select_all on public.budget_settings
  for select to authenticated using (true);

create policy budget_insert_executive on public.budget_settings
  for insert to authenticated
  with check (
    public.current_profile_role() = 'executive'
    and set_by = auth.uid()
  );

-- No update/delete policy → history is immutable. A correction is a new row.
```

### items

| op | executive | manager | staff |
|---|---|---|---|
| select | all rows, all statuses | all rows, all statuses | all rows, all statuses (transparency) |
| insert | wishlist item, as self | wishlist item, as self | wishlist item, as self (capped — see §3) |
| update | `pending_approval` rows (approve/reject) + everything managers can | `wishlist`/`in_list`/`ordered` rows (promote/order/receive/cancel) | — |
| delete | own or anyone's, while `wishlist` | own or anyone's, while `wishlist` | own only, while `wishlist` |

```sql
create policy items_select_all on public.items
  for select to authenticated using (true);

create policy items_insert_wish on public.items
  for insert to authenticated
  with check (
    requested_by = auth.uid()
    and status = 'wishlist'
    and promoted_by is null and approved_by is null and rejected_by is null
    and ordered_by is null and checked_by is null and cancelled_by is null
  );

create policy items_delete_wishlist on public.items
  for delete to authenticated
  using (
    status = 'wishlist'
    and (requested_by = auth.uid() or public.current_profile_role() in ('manager','executive'))
  );

create policy items_update_manager on public.items
  for update to authenticated
  using (
    public.current_profile_role() in ('manager','executive')
    and status in ('wishlist','in_list','ordered')
  )
  with check (public.current_profile_role() in ('manager','executive'));

create policy items_update_executive_approval on public.items
  for update to authenticated
  using (
    public.current_profile_role() = 'executive'
    and status = 'pending_approval'
  )
  with check (public.current_profile_role() = 'executive');
```

Note the division of labor: RLS here decides *which rows a role may even touch*. It does **not** enforce
exact transition validity (e.g. "wishlist can only go to in_list or pending_approval, never straight to
received") or the budget math — that's handled by the `items_status_requirements` CHECK constraint above
and the RPC functions in §3. The app should call those functions for every state change; raw `UPDATE`s are
only a backstop RLS provides in case something bypasses the intended app code path.

### notifications

| op | any authenticated user |
|---|---|
| select | own rows only |
| insert | — (system-generated only, via `security definer` functions) |
| update | own rows only (mark read) |
| delete | own rows only (dismiss) |

```sql
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- No insert policy for `authenticated` — rows are only ever written by the
-- security-definer functions in §3, which bypass RLS as the function owner.
```

### storage.objects (`receipts` bucket)

```sql
create policy receipts_select_all on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts');

create policy receipts_insert_manager on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.current_profile_role() in ('manager','executive')
  );

-- No update/delete policy → receipts are immutable once uploaded (re-upload under a new path
-- if wrong; low stakes for a 9-person team, and it keeps the audit trail honest).
```

---

## 3. Enforcing the 1/3 cap and the over-budget check

**Mechanism: a `BEFORE INSERT/UPDATE` trigger, not a `CHECK` constraint** — because a `CHECK` constraint
can only see the row being written, and both of these rules need to look at *other* rows (a staff member's
other wishlist items, or the month's total committed spend). Postgres doesn't allow subqueries in `CHECK`
constraints, so a trigger function is the right tool.

```sql
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
```

This is the hard DB-level backstop for the staff cap — it fires no matter what the client sends, closing
the gap where the prototype's cap is pure client-side JS.

The over-budget → `pending_approval` routing, and every other state transition, is handled inside
`security definer` RPC functions rather than raw client `UPDATE`s, because each one has to do several
things atomically: recompute spend, decide the correct target status *itself* (not just validate whatever
the client claims), stamp required fields, and fire the right notification. The app calls these via
`supabase.rpc(...)` instead of writing to `items` directly for every state change.

### promote_item — wishlist → in_list or pending_approval

```sql
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
```

### approve_item — pending_approval → in_list (executive only)

```sql
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
```

### reject_item — pending_approval → rejected (executive only, terminal)

```sql
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

  -- No notification fired here: rejection isn't one of the three defined notification types.
  -- The requester will see the rejected status directly in History (staff have full read access)
  -- and can resubmit as a fresh wish if they want.

  return v_item;
end;
$$;
```

### mark_ordered — in_list → ordered (manager/executive, requires a receipt)

```sql
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
  -- 'receipts' storage bucket (see storage.objects policies in §2) — this function
  -- only records the path, it does not touch Storage itself.

  return v_item;
end;
$$;
```

### mark_received — ordered → received (manager/executive, terminal)

```sql
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
```

### cancel_item — in_list or ordered → cancelled (manager/executive, terminal)

```sql
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

  -- No notification fired here: cancellation isn't one of the three defined notification
  -- types. Staff will see the cancelled status directly in History.

  return v_item;
end;
$$;
```

### Grants

`security definer` functions still need an explicit `EXECUTE` grant to the role that will call them —
being the definer only changes whose *table* privileges the function body runs with, not who's allowed to
call the function itself.

```sql
grant execute on function public.promote_item(uuid, text)   to authenticated;
grant execute on function public.approve_item(uuid)         to authenticated;
grant execute on function public.reject_item(uuid)          to authenticated;
grant execute on function public.mark_ordered(uuid, text)   to authenticated;
grant execute on function public.mark_received(uuid, uuid)  to authenticated;
grant execute on function public.cancel_item(uuid, text)    to authenticated;
```

Every function does its own `current_profile_role()` check up front, so granting `EXECUTE` to all
authenticated users is safe — an unauthorized caller's request fails inside the function with a clear
error, it never reaches an unguarded `UPDATE`.

---

## 4. How the monthly reset works

**Mostly a computed view, no cron required for correctness:**

- `current_budget_amount()` always returns the newest `budget_settings` row with `effective_from <= now()`.
  That's how the amount "carries forward" automatically — there's nothing to reset, it just keeps
  returning the same row until an executive inserts a new one, and a mid-month change takes effect
  immediately for any *future* comparison without touching past ones.
- "Spent this month" is never stored — it's `sum(qty × unit_price)` over items where
  `budget_month = date_trunc('month', now())` and `status in ('in_list','ordered','received')`.
  `budget_month` is stamped once, at promotion (inside `promote_item`), and never changed again.
- When the calendar rolls to a new month, last month's promoted items still carry last month's
  `budget_month`, so they silently drop out of *this* month's sum — that's the "reset to 0," achieved for
  free by the query, not by any batch job zeroing a counter.
- Items still sitting in `in_list` or `pending_approval` from last month keep existing, keep their old
  `budget_month`, and stay fully actionable (a manager can still order them, an executive can still
  approve/reject them) — that's the "carries over automatically," and it doesn't contradict the reset
  because they're not double-counted against the new month's fresh budget.

**Where a light `pg_cron` job could still help — optional, not required for correctness:**
- A once-a-month job (Supabase supports the `pg_cron` extension) to notify executives "new month started,
  here's last month's total" — a convenience, not a fix.
- If item volume grows enough that recomputing `items_detailed` aggregates on every CSV export gets slow,
  a monthly snapshot table would help — not worth building for a 9-person team ordering snacks; defer this
  until it's actually a problem.

CSV export needs no new schema — the frontend queries `items_detailed` filtered to
`received`/`rejected`/`cancelled` and converts to CSV client-side.

---

## Status — 2026-08-12

- All three assumptions above are confirmed.
- Receipt storage path convention: **`receipts/{item_id}/{original_filename}`**, confirmed. Storage RLS
  (0010) only checks `bucket_id`, not path — it can't validate path shape — so the frontend upload code is
  responsible for always writing to this exact convention before calling `mark_ordered`.
- All 11 migrations (0001–0010 plus the 0011 security-hardening follow-up) are applied to the live
  "Supplies" Supabase project. See `supabase/migrations/`.
- Next up: the Next.js frontend.
