import { createClient } from "@/lib/supabase/server";
import { historyMonthKey, historyMonthOptions, isMonthKey, type MonthOption } from "@/lib/history-month";
import type { Tables } from "@/lib/types";

// Loads one module's History rows with the page's Filter (status) and Month applied. The
// History pages and their CSV exports both go through here, so an export always contains
// exactly the rows on screen.

export type HistoryStatus = "received" | "rejected" | "cancelled";
const HISTORY_STATUSES: readonly HistoryStatus[] = ["received", "rejected", "cancelled"];

function isHistoryStatus(value: string | null | undefined): value is HistoryStatus {
  return value === "received" || value === "rejected" || value === "cancelled";
}

export type HistoryFilters = { status: HistoryStatus | null; month: string | null };

// Unknown or malformed values fall back to "all", as if the parameter were absent.
export function parseHistoryFilters(params: { status?: string | null; month?: string | null }): HistoryFilters {
  return {
    status: isHistoryStatus(params.status) ? params.status : null,
    month: isMonthKey(params.month) ? params.month : null,
  };
}

// The same filters as a query string ("" when both are "all"), for links that keep them.
export function historyFiltersQuery({ status, month }: HistoryFilters): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (month) params.set("month", month);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getHistoryItems(
  module: "groceries" | "supplies",
  filters: HistoryFilters,
): Promise<{
  items: Tables<"items_detailed">[];
  // Every month with history in this module, whatever the status filter, so the Month
  // dropdown doesn't change as the Filter changes.
  months: MonthOption[];
  // Whether the module has any history at all, to tell "nothing yet" from "no matches".
  hasAny: boolean;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items_detailed")
    .select("*")
    .eq("module", module)
    .in("status", HISTORY_STATUSES)
    .order("updated_at", { ascending: false });

  const all = data ?? [];
  const items = all.filter(
    (item) =>
      (!filters.status || item.status === filters.status) &&
      (!filters.month || historyMonthKey(item) === filters.month),
  );

  return {
    items,
    months: historyMonthOptions(all, filters.month),
    hasAny: all.length > 0,
    error: error?.message ?? null,
  };
}
