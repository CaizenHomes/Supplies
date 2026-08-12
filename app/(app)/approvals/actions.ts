"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_item", { p_item_id: itemId });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/approvals");
  revalidatePath("/orders");
}

export async function rejectItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_item", { p_item_id: itemId });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/approvals");
  revalidatePath("/orders");
  revalidatePath("/history");
}
