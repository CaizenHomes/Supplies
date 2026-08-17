import { formatCurrency, formatDate } from "@/lib/format";
import type { Tables } from "@/lib/types";

type HistoryRow = Tables<"items_detailed"> & { receiptUrl: string | null };

const STATUS_LABEL: Record<string, string> = {
  received: "Received & verified",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<string, string> = {
  received: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
  cancelled: "bg-bg text-text-muted",
};

function rowTotal(item: HistoryRow): number | null {
  return item.unit_price === null ? null : (item.qty ?? 0) * item.unit_price;
}

function groupByVendor(items: HistoryRow[]) {
  const groups = new Map<string, HistoryRow[]>();
  for (const item of items) {
    const vendor = item.vendor ?? "Unknown vendor";
    const existing = groups.get(vendor);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(vendor, [item]);
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([vendor, vendorItems]) => {
      const totals = vendorItems.map(rowTotal).filter((total) => total !== null) as number[];
      const subtotal = totals.length > 0 ? totals.reduce((sum, total) => sum + total, 0) : null;
      return { vendor, items: vendorItems, subtotal };
    });
}

export function HistoryTable({ items }: { items: HistoryRow[] }) {
  const groups = groupByVendor(items);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-[#fafbfc]">
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Item
            </th>
            <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Qty
            </th>
            <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Total
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Status
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Receipt
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Verified by
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Completed
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) => {
            const rows = [
              <tr key={`${group.vendor}__header`} className="border-b border-border bg-bg">
                <td
                  colSpan={7}
                  className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted"
                >
                  {group.vendor}
                </td>
              </tr>,
              ...group.items.map((item) => {
                const total = rowTotal(item);
                const completedAt =
                  item.checked_at ?? item.rejected_at ?? item.cancelled_at ?? item.requested_at;
                const status = item.status ?? "";

                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-[#fafbfc]">
                    <td className="px-3.5 py-3">
                      <div className="font-medium text-text">
                        {item.name}
                        {item.urgency === "urgent" && (
                          <span className="ml-1.5 inline-block rounded-full bg-danger-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-danger">
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-text-muted">
                        {item.vendor} · by {item.requested_by_name ?? "Unknown"}
                      </div>
                      {status === "cancelled" && item.cancellation_reason && (
                        <div className="mt-0.5 text-xs text-text-subtle">
                          Reason: {item.cancellation_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right tabular-nums">{item.qty}</td>
                    <td className="px-3.5 py-3 text-right font-semibold tabular-nums">
                      {total === null ? (
                        <span className="text-xs font-normal text-text-subtle">—</span>
                      ) : (
                        formatCurrency(total)
                      )}
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[status] ?? "bg-bg text-text-muted"}`}
                      >
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      {item.receiptUrl ? (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] text-text-muted hover:border-accent hover:text-accent"
                        >
                          📎 view
                        </a>
                      ) : (
                        <span className="text-xs text-text-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-[12.5px] text-text">
                      {item.checked_by_name ?? <span className="text-xs text-text-subtle">—</span>}
                    </td>
                    <td className="px-3.5 py-3 text-[12.5px] text-text-muted">
                      {formatDate(completedAt)}
                    </td>
                  </tr>
                );
              }),
              <tr key={`${group.vendor}__subtotal`} className="border-b border-border bg-bg">
                <td className="px-3.5 py-2 text-xs font-semibold text-text-muted">Subtotal</td>
                <td className="px-3.5 py-2 text-right text-xs font-semibold tabular-nums text-text-muted">
                  {group.items.length} item{group.items.length === 1 ? "" : "s"}
                </td>
                <td className="px-3.5 py-2 text-right text-xs font-semibold tabular-nums text-text">
                  {group.subtotal === null ? "—" : formatCurrency(group.subtotal)}
                </td>
                <td colSpan={4} className="px-3.5 py-2" />
              </tr>,
            ];
            return rows;
          })}
        </tbody>
      </table>
    </div>
  );
}
