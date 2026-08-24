import { formatCurrency } from "@/lib/format";
import type { MonthlyBreakdownRow } from "@/lib/inventory";

export function MonthlyBreakdownTable({ rows }: { rows: MonthlyBreakdownRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface p-8 text-center text-text-muted">
        No received orders yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-[#fafbfc]">
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Month
            </th>
            <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Groceries
            </th>
            <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Supplies
            </th>
            <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border last:border-0">
              <td className="px-3.5 py-3 font-medium text-text">{row.label}</td>
              <td className="px-3.5 py-3 text-right tabular-nums text-text-muted">
                {formatCurrency(row.groceries)}
              </td>
              <td className="px-3.5 py-3 text-right tabular-nums text-text-muted">
                {formatCurrency(row.supplies)}
              </td>
              <td className="px-3.5 py-3 text-right font-semibold tabular-nums text-text">
                {formatCurrency(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
