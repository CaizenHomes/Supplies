import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/types";

export type ModuleTotals = { groceries: number; supplies: number; total: number };
export type MonthPoint = { key: string; label: string; total: number };
export type MonthlyBreakdownRow = {
  key: string;
  label: string;
  groceries: number;
  supplies: number;
  total: number;
};

export type InventoryData = {
  thisMonth: ModuleTotals;
  ytd: ModuleTotals;
  monthlyGroceries: MonthPoint[];
  monthlySupplies: MonthPoint[];
  monthlyBreakdown: MonthlyBreakdownRow[];
};

type ReceivedRow = {
  module: Enums<"item_module">;
  checked_at: string | null;
  total: number | null;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

export async function getInventoryData(): Promise<InventoryData> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items_detailed")
    .select("module, checked_at, total")
    .eq("status", "received");

  const rows = (data ?? []) as ReceivedRow[];
  const now = new Date();
  const thisMonthKey = monthKey(now);
  const currentYear = now.getFullYear();

  const thisMonth: ModuleTotals = { groceries: 0, supplies: 0, total: 0 };
  const ytd: ModuleTotals = { groceries: 0, supplies: 0, total: 0 };

  // Last 12 months, oldest first, so the charts read left-to-right chronologically.
  const months: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: MONTH_LABELS[d.getMonth()] });
  }
  const groceriesByMonth = new Map(months.map((m) => [m.key, 0]));
  const suppliesByMonth = new Map(months.map((m) => [m.key, 0]));

  // All-time, keyed by month, for the breakdown table — unlike the charts above this
  // isn't padded to a fixed window, only months that actually have received items appear.
  const allTimeByMonth = new Map<string, { groceries: number; supplies: number }>();

  for (const row of rows) {
    // Skip items received without a recorded price — nothing meaningful to add to spend.
    if (!row.checked_at || row.total === null) continue;

    const checkedAt = new Date(row.checked_at);
    const key = monthKey(checkedAt);
    const amount = row.total;

    if (key === thisMonthKey) {
      thisMonth.total += amount;
      thisMonth[row.module] += amount;
    }
    if (checkedAt.getFullYear() === currentYear) {
      ytd.total += amount;
      ytd[row.module] += amount;
    }

    const byMonth = row.module === "groceries" ? groceriesByMonth : suppliesByMonth;
    if (byMonth.has(key)) {
      byMonth.set(key, (byMonth.get(key) ?? 0) + amount);
    }

    const allTimeEntry = allTimeByMonth.get(key) ?? { groceries: 0, supplies: 0 };
    allTimeEntry[row.module] += amount;
    allTimeByMonth.set(key, allTimeEntry);
  }

  const monthlyGroceries = months.map((m) => ({ ...m, total: groceriesByMonth.get(m.key) ?? 0 }));
  const monthlySupplies = months.map((m) => ({ ...m, total: suppliesByMonth.get(m.key) ?? 0 }));

  const monthlyBreakdown = Array.from(allTimeByMonth.entries())
    .map(([key, totals]) => ({
      key,
      label: monthLabel(key),
      groceries: totals.groceries,
      supplies: totals.supplies,
      total: totals.groceries + totals.supplies,
    }))
    .sort((a, b) => b.key.localeCompare(a.key));

  return { thisMonth, ytd, monthlyGroceries, monthlySupplies, monthlyBreakdown };
}
