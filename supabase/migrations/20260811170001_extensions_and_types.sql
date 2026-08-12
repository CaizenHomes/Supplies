-- Supplies — 0001: extensions and enum types
-- See PLAN.md §1 (Schema) for design rationale.

create extension if not exists pgcrypto;

create type user_role as enum ('executive','manager','staff');

create type item_status as enum (
  'wishlist', 'pending_approval', 'in_list', 'ordered', 'received', 'rejected', 'cancelled'
);

create type notification_type as enum (
  'wish_promoted', 'approval_needed', 'item_received'
);
