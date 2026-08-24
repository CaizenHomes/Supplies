import { formatCurrency } from "@/lib/format";
import type { MonthPoint } from "@/lib/inventory";

export function MonthlyChart({ title, data }: { title: string; data: MonthPoint[] }) {
  const max = Math.max(...data.map((point) => point.total), 1);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium text-text">{title}</p>
      <div className="flex h-36 items-end gap-1.5">
        {data.map((point) => (
          <div
            key={point.key}
            title={`${point.label}: ${formatCurrency(point.total)}`}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          >
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
