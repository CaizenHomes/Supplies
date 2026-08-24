import { formatCurrency } from "@/lib/format";
import type { MonthPoint } from "@/lib/inventory";

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fullMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${FULL_MONTH_NAMES[month - 1]} ${year}`;
}

type MonthlyChartProps = {
  title: string;
  module: "groceries" | "supplies";
  groceriesData: MonthPoint[];
  suppliesData: MonthPoint[];
};

export function MonthlyChart({ title, module, groceriesData, suppliesData }: MonthlyChartProps) {
  const barData = module === "groceries" ? groceriesData : suppliesData;
  const max = Math.max(...barData.map((point) => point.total), 1);
  const groceriesByKey = new Map(groceriesData.map((point) => [point.key, point.total]));
  const suppliesByKey = new Map(suppliesData.map((point) => [point.key, point.total]));

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-text">{title}</p>
      <div className="flex h-36 items-end gap-1.5">
        {barData.map((point) => {
          const groceries = groceriesByKey.get(point.key) ?? 0;
          const supplies = suppliesByKey.get(point.key) ?? 0;
          const total = groceries + supplies;

          return (
            <div
              key={point.key}
              className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-2 text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                <p className="mb-1.5 font-semibold text-text">{fullMonthLabel(point.key)}</p>
                <p className="flex items-center justify-between gap-4 text-text-muted">
                  <span>Groceries</span>
                  <span className="tabular-nums text-text">{formatCurrency(groceries)}</span>
                </p>
                <p className="flex items-center justify-between gap-4 text-text-muted">
                  <span>Supplies</span>
                  <span className="tabular-nums text-text">{formatCurrency(supplies)}</span>
                </p>
                <p className="mt-1.5 flex items-center justify-between gap-4 border-t border-border pt-1.5 font-semibold text-text">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </p>
              </div>

              <div
                className="w-full rounded-t bg-accent"
                style={{ height: point.total > 0 ? `${Math.max((point.total / max) * 100, 3)}%` : "1px" }}
              />
              <span className="text-[10px] text-text-muted">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
