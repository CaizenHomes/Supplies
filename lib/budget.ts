import { createClient } from "@/lib/supabase/server";

export type BudgetSnapshot = {
  budget: number;
  spent: number;
};

export async function getBudgetSnapshot(): Promise<BudgetSnapshot> {
  const supabase = await createClient();

  const [{ data: budget }, { data: spent }] = await Promise.all([
    supabase.rpc("current_budget_amount"),
    supabase.rpc("spent_this_month"),
  ]);

  return { budget: budget ?? 0, spent: spent ?? 0 };
}
