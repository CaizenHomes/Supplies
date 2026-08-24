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
  moduleLabel: string;
  data: MonthPoint[];
};

export function MonthlyChart({ title, moduleLabel, data }: MonthlyChartProps) {
  const max = Math.max(...data.map((point) => point.total), 1);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-text">{title}</p>
      <div className="flex h-36 items-end gap-1.5">
        {data.map((point) => (
          <div
            key={point.key}
            className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          >
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text opacity-0 shadow-md transition-opacity group-hover:opacity-100">
              {fullMonthLabel(point.key)} — {moduleLabel}:{" "}
              <span className="tabular-nums font-semibold">{formatCurrency(point.total)}</span>
            </div>

            <div
              className="w-full rounded-t bg-accent"
              style={{ height: point.total > 0 ? `${Math.max((point.total / max) * 100, 3)}%` : "1px" }}
            />
            <span className="text-[10px] text-text-muted">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
