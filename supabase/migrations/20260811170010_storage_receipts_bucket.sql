-- Supplies — 0010: receipts storage bucket and its RLS policies.
-- Path convention (enforced by app code, not by these policies):
--   receipts/{item_id}/{original_filename}
-- See PLAN.md §2 (storage.objects policies) for design rationale.

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy receipts_select_all on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts');

create policy receipts_insert_manager on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.current_profile_role() in ('manager','executive')
  );

-- No update/delete policy → receipts are immutable once uploaded (re-upload under a new
-- path if wrong; low stakes for a 9-person team, and it keeps the audit trail honest).
