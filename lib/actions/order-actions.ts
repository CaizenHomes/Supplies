"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { receiptStoragePath } from "@/lib/receipts";
import { parseTaxInput, type OrderTax } from "@/lib/order-totals";

// Shared by both the Groceries and Supplies Order List pages — the underlying RPCs
// (mark_ordered/mark_received/cancel_item) are module-agnostic, so one copy of this
// logic serves both. Revalidating both modules' paths unconditionally is cheap and
// avoids needing an extra query just to know which module the item belongs to.
function revalidateOrderPaths() {
  revalidatePath("/groceries/orders");
  revalidatePath("/supplies/orders");
}

function revalidateHistoryPaths() {
  revalidatePath("/groceries/history");
  revalidatePath("/supplies/history");
}

// Order tax changes what the Groceries budget bar shows (budget_spent includes it), so
// refresh the whole Groceries layout, which also covers its Order List and History pages.
function revalidateGroceriesLayout() {
  revalidatePath("/groceries", "layout");
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const TAX_NOT_SAVED = "Order saved, but tax wasn't — use Edit tax.";

// Only the Groceries mark-ordered dialogs send module=groceries and the optional GST/PST
// fields; Supplies orders never carry tax. Returns null when both fields are blank.
function readOrderTax(formData: FormData): { tax: OrderTax | null; error?: string } {
  if (formData.get("module") !== "groceries") return { tax: null };

  const gst = parseTaxInput(formData.get("gst"), "GST");
  if (gst.error !== undefined) return { tax: null, error: gst.error };
  const pst = parseTaxInput(formData.get("pst"), "PST");
  if (pst.error !== undefined) return { tax: null, error: pst.error };

  if (gst.value === null && pst.value === null) return { tax: null };
  return { tax: { gst: gst.value, pst: pst.value } };
}

async function saveOrderTax(supabase: SupabaseServerClient, receiptPath: string, tax: OrderTax) {
  const { error } = await supabase
    .from("order_taxes")
    .upsert({ receipt_path: receiptPath, gst: tax.gst, pst: tax.pst }, { onConflict: "receipt_path" });
  return error;
}

export type MarkOrderedActionState = {
  error?: string;
  success?: boolean;
  // Set when the order itself was saved but its tax wasn't (a separate step), so the
  // dialog can show the error without offering to submit the order again.
  orderSaved?: boolean;
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

  const { tax, error: taxError } = readOrderTax(formData);
  if (taxError) {
    return { error: taxError };
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

  if (tax) {
    const taxSaveError = await saveOrderTax(supabase, path, tax);
    if (taxSaveError) {
      // No revalidation here: refreshing would move the item out of the in-list section and
      // unmount the dialog before the message is seen. The dialog refreshes on close.
      return { error: TAX_NOT_SAVED, orderSaved: true };
    }
    revalidateGroceriesLayout();
  }

  revalidateOrderPaths();
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

  revalidateOrderPaths();
  revalidateHistoryPaths();
  return { success: true };
}

export type MarkOrderedBatchActionState = {
  error?: string;
  success?: boolean;
  orderSaved?: boolean;
};

export async function markOrderedBatch(
  _prevState: MarkOrderedBatchActionState,
  formData: FormData,
): Promise<MarkOrderedBatchActionState> {
  const itemIds = formData.getAll("item_ids").map(String).filter(Boolean);
  const file = formData.get("receipt");

  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please attach a receipt or PO." };
  }

  const { tax, error: taxError } = readOrderTax(formData);
  if (taxError) {
    return { error: taxError };
  }

  const supabase = await createClient();
  const path = receiptStoragePath(itemIds[0], file.name);

  const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file, {
    contentType: file.type || undefined,
  });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error } = await supabase.rpc("mark_ordered_batch", {
    p_item_ids: itemIds,
    p_receipt_path: path,
  });

  if (error) {
    return { error: error.message };
  }

  if (tax) {
    const taxSaveError = await saveOrderTax(supabase, path, tax);
    if (taxSaveError) {
      // See markOrdered: the dialog refreshes the page on close instead.
      return { error: TAX_NOT_SAVED, orderSaved: true };
    }
    revalidateGroceriesLayout();
  }

  revalidateOrderPaths();
  return { success: true };
}

export type UpdateOrderTaxActionState = {
  error?: string;
  success?: boolean;
};

// Add or change GST/PST on an existing Groceries order (after ordering or after receiving).
// RLS on order_taxes enforces the role (manager/executive) and that the receipt belongs to
// Groceries items; blank fields clear that tax back to $0.
export async function updateOrderTax(
  _prevState: UpdateOrderTaxActionState,
  formData: FormData,
): Promise<UpdateOrderTaxActionState> {
  const receiptPath = String(formData.get("receipt_path") ?? "");
  if (!receiptPath) {
    return { error: "Missing order." };
  }

  const gst = parseTaxInput(formData.get("gst"), "GST");
  if (gst.error !== undefined) return { error: gst.error };
  const pst = parseTaxInput(formData.get("pst"), "PST");
  if (pst.error !== undefined) return { error: pst.error };

  const supabase = await createClient();
  const error = await saveOrderTax(supabase, receiptPath, { gst: gst.value, pst: pst.value });

  if (error) {
    return {
      error: error.code === "42501" ? "You don't have permission to edit tax on this order." : error.message,
    };
  }

  revalidateGroceriesLayout();
  return { success: true };
}

export type MarkReceivedBatchActionState = {
  error?: string;
  success?: boolean;
};

export async function markReceivedBatch(
  _prevState: MarkReceivedBatchActionState,
  formData: FormData,
): Promise<MarkReceivedBatchActionState> {
  const itemIds = formData.getAll("item_ids").map(String).filter(Boolean);
  const checkedBy = String(formData.get("checked_by") ?? "");

  if (itemIds.length === 0) {
    return { error: "No items selected." };
  }
  if (!checkedBy) {
    return { error: "Select who verified the delivery." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_received_batch", {
    p_item_ids: itemIds,
    p_checked_by: checkedBy,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateOrderPaths();
  revalidateHistoryPaths();
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

  revalidateOrderPaths();
  revalidateHistoryPaths();
}
