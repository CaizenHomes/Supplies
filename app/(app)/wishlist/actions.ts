"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AddWishActionState = {
  error?: string;
  success?: boolean;
};

function normalizeLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function addWishlistItem(
  _prevState: AddWishActionState,
  formData: FormData,
): Promise<AddWishActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim();
  const qty = Number(formData.get("qty"));
  const unitPrice = Number(formData.get("unit_price"));
  const link = normalizeLink(String(formData.get("link") ?? ""));

  if (!name || !vendor) {
    return { error: "Name and vendor are required." };
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return { error: "Quantity must be a whole number greater than 0." };
  }
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { error: "Unit price must be greater than 0." };
  }

  const { error } = await supabase.from("items").insert({
    name,
    vendor,
    qty,
    unit_price: unitPrice,
    link,
    requested_by: user.id,
    status: "wishlist",
  });

  if (error) {
    // Surfaces the DB trigger's own message verbatim for the 1/3-cap backstop,
    // e.g. "This exceeds your wishlist allowance ($X.XX of $Y.YY used, this item adds $Z.ZZ)."
    return { error: error.message };
  }

  revalidatePath("/wishlist");
  return { success: true };
}

export async function deleteWishlistItem(itemId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("status", "wishlist")
    .select("id");

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error(
      "That item couldn't be removed — it may already be gone, or you may not have permission.",
    );
  }

  revalidatePath("/wishlist");
}

export type PromoteActionState = {
  error?: string;
  success?: boolean;
};

export async function promoteWishlistItem(
  _prevState: PromoteActionState,
  formData: FormData,
): Promise<PromoteActionState> {
  const itemId = String(formData.get("item_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("promote_item", {
    p_item_id: itemId,
    p_reason: reason || undefined,
  });

  if (error) {
    // Surfaces promote_item's own messages verbatim, e.g. "A reason is required when
    // promoting an over-budget item." or the manager/executive role check.
    return { error: error.message };
  }

  revalidatePath("/wishlist");
  revalidatePath("/orders");
  revalidatePath("/approvals");
  return { success: true };
}
