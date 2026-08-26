"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateProductActionState = {
  error?: string;
  success?: boolean;
};

export async function updateProduct(
  _prevState: UpdateProductActionState,
  formData: FormData,
): Promise<UpdateProductActionState> {
  const id = String(formData.get("product_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const vendorRaw = String(formData.get("default_vendor") ?? "").trim();
  const priceRaw = String(formData.get("default_unit_price") ?? "").trim();
  const price = priceRaw === "" ? null : Number(priceRaw);
  const barcodeRaw = String(formData.get("barcode") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();

  if (!id) {
    return { error: "Missing product." };
  }
  if (!name) {
    return { error: "Name is required." };
  }
  if (price !== null && (!Number.isFinite(price) || price <= 0)) {
    return { error: "Enter a valid default price, or leave it blank." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name,
      default_vendor: vendorRaw || null,
      default_unit_price: price,
      barcode: barcodeRaw || null,
      category: categoryRaw || null,
    })
    .eq("id", id);

  if (error) {
    // 23505 = unique_violation — the barcode column has a UNIQUE constraint.
    if (error.code === "23505") {
      return { error: "That barcode is already used by another product." };
    }
    return { error: error.message };
  }

  revalidatePath("/inventory/products");
  revalidatePath(`/inventory/products/${id}`);
  return { success: true };
}
