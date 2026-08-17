-- Supplies — removes the 1/3-of-budget wishlist cap (introduced in 0008). The
-- manager-approval step at promotion time (promote_item's over-budget routing) is the
-- real gatekeeper for spend; the wishlist itself no longer needs its own price ceiling.

drop trigger if exists trg_enforce_wishlist_cap on public.items;
drop function if exists public.enforce_wishlist_cap();
