import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types";

export async function getPendingApprovalCount(module: Enums<"item_module">): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("module", module)
    .eq("status", "pending_approval");

  return count ?? 0;
}
