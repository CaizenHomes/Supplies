-- Supplies — 0011: security hardening flagged by the Supabase advisor after 0001-0010
-- were applied. Not part of the original design change — these are Postgres/Supabase
-- defaults that need explicit tightening: mutable search_path on trigger functions,
-- and the implicit EXECUTE grant to PUBLIC (hence anon) that every new function gets
-- unless revoked.

alter function public.set_updated_at() set search_path = public;
alter function public.prevent_last_executive_removal() set search_path = public;
alter function public.enforce_wishlist_cap() set search_path = public;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.current_profile_role() from public;
revoke execute on function public.current_budget_amount() from public;
revoke execute on function public.promote_item(uuid, text) from public;
revoke execute on function public.approve_item(uuid) from public;
revoke execute on function public.reject_item(uuid) from public;
revoke execute on function public.mark_ordered(uuid, text) from public;
revoke execute on function public.mark_received(uuid, uuid) from public;
revoke execute on function public.cancel_item(uuid, text) from public;

-- The revoke-from-PUBLIC above doesn't actually strip anon/authenticated: Supabase's
-- default privileges grant EXECUTE to those roles directly at function-creation time,
-- not via PUBLIC. anon needs no access to any of these at all; authenticated keeps
-- EXECUTE on everything except handle_new_user, which only the on_auth_user_created
-- trigger should ever invoke (as its security-definer owner).
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.current_profile_role() from anon;
revoke execute on function public.current_budget_amount() from anon;
revoke execute on function public.promote_item(uuid, text) from anon;
revoke execute on function public.approve_item(uuid) from anon;
revoke execute on function public.reject_item(uuid) from anon;
revoke execute on function public.mark_ordered(uuid, text) from anon;
revoke execute on function public.mark_received(uuid, uuid) from anon;
revoke execute on function public.cancel_item(uuid, text) from anon;
revoke execute on function public.handle_new_user() from authenticated;
