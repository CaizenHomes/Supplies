"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Shared by both Approvals pages — approve_item/reject_item are module-agnostic RPCs.
function revalidateApprovalPaths() {
  revalidatePath("/groceries/approvals");
  revalidatePath("/supplies/approvals");
  revalidatePath("/groceries/orders");
  revalidatePath("/supplies/orders");
}

export async function approveItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_item", { p_item_id: itemId });

  if (error) {
    throw new Error(error.message);
  }

  revalidateApprovalPaths();
}

export async function rejectItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_item", { p_item_id: itemId });

  if (error) {
    throw new Error(error.message);
  }

  revalidateApprovalPaths();
  revalidatePath("/groceries/history");
  revalidatePath("/supplies/history");
}
