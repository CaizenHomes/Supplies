import { formatCurrency } from "@/lib/format";

export function BudgetBar({ budget, spent }: { budget: number; spent: number }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = budget - spent;
  const fillClass = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-accent";

  return (
    <div className="border-t border-border px-8 py-2.5">
      <div className="flex items-baseline gap-2 text-[13px]">
        <span className="text-text-muted">Monthly budget</span>
        <span className="font-semibold text-text">
          {formatCurrency(spent)} / {formatCurrency(budget)}
        </span>
        <span className={remaining >= 0 ? "text-text-muted" : "font-medium text-danger"}>
          {remaining >= 0
            ? `· ${formatCurrency(remaining)} remaining`
            : `· ${formatCurrency(Math.abs(remaining))} over`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
