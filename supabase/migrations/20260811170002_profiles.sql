-- Supplies — 0002: profiles table, updated_at housekeeping, invite provisioning,
-- and the last-executive safety net.
-- See PLAN.md §1 (Schema) and §2 (profiles RLS section) for design rationale.

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
-- updated_at housekeeping (shared helper; also used by items in 0004)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
-- Safety net: an executive can't lock the company out by demoting/deactivating
-- themselves if they're the only one left.
-- ============================================================
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
