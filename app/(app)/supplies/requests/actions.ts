"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types";

export type AddSupplyActionState = {
  error?: string;
  success?: boolean;
};

function normalizeLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function addSupplyRequest(
  _prevState: AddSupplyActionState,
  formData: FormData,
): Promise<AddSupplyActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim();
  const qty = Number(formData.get("qty"));
  const priceRaw = String(formData.get("unit_price") ?? "").trim();
  const unitPrice = priceRaw === "" ? null : Number(priceRaw);
  const link = normalizeLink(String(formData.get("link") ?? ""));
  const note = String(formData.get("note") ?? "").trim();
  const urgency = String(formData.get("urgency") ?? "normal") as Enums<"item_urgency">;

  if (!name || !vendor) {
    return { error: "Name and vendor are required." };
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return { error: "Quantity must be a whole number greater than 0." };
  }
  if (unitPrice !== null && (!Number.isFinite(unitPrice) || unitPrice <= 0)) {
    return { error: "Enter a valid estimated unit price, or leave it blank." };
  }
  if (!note) {
    return { error: "A reason is required for Supplies requests." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_supply_request", {
    p_name: name,
    p_vendor: vendor,
    p_qty: qty,
    p_unit_price: unitPrice ?? undefined,
    p_link: link ?? undefined,
    p_note: note,
    p_urgency: urgency,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/supplies/requests");
  revalidatePath("/supplies/orders");
  revalidatePath("/supplies/approvals");
  return { success: true };
}

export async function withdrawSupplyRequest(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_item", {
    p_item_id: itemId,
    p_reason: undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/supplies/requests");
  revalidatePath("/supplies/approvals");
  revalidatePath("/supplies/history");
}
