"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { receiptStoragePath } from "@/lib/receipts";

export type MarkOrderedActionState = {
  error?: string;
  success?: boolean;
};

export async function markOrdered(
  _prevState: MarkOrderedActionState,
  formData: FormData,
): Promise<MarkOrderedActionState> {
  const itemId = String(formData.get("item_id") ?? "");
  const file = formData.get("receipt");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please attach a receipt or PO." };
  }

  const supabase = await createClient();
  const path = receiptStoragePath(itemId, file.name);

  const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file, {
    contentType: file.type || undefined,
  });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error } = await supabase.rpc("mark_ordered", {
    p_item_id: itemId,
    p_receipt_path: path,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/orders");
  return { success: true };
}

export type MarkReceivedActionState = {
  error?: string;
  success?: boolean;
};

export async function markReceived(
  _prevState: MarkReceivedActionState,
  formData: FormData,
): Promise<MarkReceivedActionState> {
  const itemId = String(formData.get("item_id") ?? "");
  const checkedBy = String(formData.get("checked_by") ?? "");

  if (!checkedBy) {
    return { error: "Select who verified the delivery." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_received", {
    p_item_id: itemId,
    p_checked_by: checkedBy,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/orders");
  revalidatePath("/history");
  return { success: true };
}

export async function cancelOrderItem(itemId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_item", {
    p_item_id: itemId,
    p_reason: reason || undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/orders");
  revalidatePath("/history");
}
