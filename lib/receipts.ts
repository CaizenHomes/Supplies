import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — plenty for viewing a receipt in one sitting

export function sanitizeFilename(name: string): string {
  return name.trim().replace(/\s+/g, "_").replace(/[^\w.\-]/g, "");
}

export function receiptStoragePath(itemId: string, originalFilename: string): string {
  return `receipts/${itemId}/${sanitizeFilename(originalFilename)}`;
}

export async function getReceiptSignedUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("receipts")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  return data?.signedUrl ?? null;
}
