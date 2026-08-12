-- Supplies — 0007: Row-Level Security — enable RLS and all per-table policies
-- for profiles, budget_settings, items, and notifications.
-- See PLAN.md §2 (Row-Level Security) for the full per-role/per-operation table
-- and rationale. Storage policies for the receipts bucket are in 0010, not here.

alter table public.profiles enable row level security;
alter table public.budget_settings enable row level security;
alter table public.items enable row level security;
alter table public.notifications enable row level security;

-- ============================================================
-- profiles
-- ============================================================
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

-- No INSERT or DELETE policy exists → both are denied by default for the authenticated role.
-- (INSERT happens via the handle_new_user trigger in 0002; deactivate via is_active instead of deleting.)

-- ============================================================
-- budget_settings
-- ============================================================
create policy budget_select_all on public.budget_settings
  for select to authenticated using (true);

create policy budget_insert_executive on public.budget_settings
  for insert to authenticated
  with check (
    public.current_profile_role() = 'executive'
    and set_by = auth.uid()
  );

-- No update/delete policy → history is immutable. A correction is a new row.

-- ============================================================
-- items
-- ============================================================
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

-- Note: RLS here decides which rows a role may even touch. Exact transition validity
-- (old status -> new status) and the budget math are enforced by the
-- items_status_requirements CHECK constraint (0004) and the RPC functions (0009).

-- ============================================================
-- notifications
-- ============================================================
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- No insert policy for `authenticated` — rows are only ever written by the
-- security-definer RPC functions in 0009, which bypass RLS as the function owner.
