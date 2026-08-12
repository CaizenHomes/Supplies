import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getReceiptSignedUrl } from "@/lib/receipts";
import { formatCurrency, formatDate } from "@/lib/format";
import { HistoryFilter } from "./history-filter";

type HistoryStatus = "received" | "rejected" | "cancelled";
const HISTORY_STATUSES: readonly HistoryStatus[] = ["received", "rejected", "cancelled"];

function isHistoryStatus(value: string | undefined): value is HistoryStatus {
  return value === "received" || value === "rejected" || value === "cancelled";
}

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

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const { status } = await searchParams;
  const statusFilter = isHistoryStatus(status) ? status : null;
  const statuses: readonly HistoryStatus[] = statusFilter ? [statusFilter] : HISTORY_STATUSES;

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("items_detailed")
    .select("*")
    .in("status", statuses)
    .order("updated_at", { ascending: false });

  const history = await Promise.all(
    (items ?? []).map(async (item) => ({
      ...item,
      receiptUrl: item.receipt_path ? await getReceiptSignedUrl(item.receipt_path) : null,
    })),
  );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-text">Order history</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Received and verified items, rejected requests, and cancelled orders.
          </p>
        </div>
        {profile.role === "executive" && (
          <a
            href="/history/export"
            className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-bg"
          >
            Export CSV
          </a>
        )}
      </div>

      <HistoryFilter />

      {history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          <p className="mb-1 text-[15px] font-medium text-text">No history yet</p>
          <p>Received, rejected, and cancelled items appear here.</p>
        </div>
      ) : (
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
              {history.map((item) => {
                const total = (item.qty ?? 0) * (item.unit_price ?? 0);
                const completedAt =
                  item.checked_at ?? item.rejected_at ?? item.cancelled_at ?? item.requested_at;
                const status = item.status ?? "";

                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-[#fafbfc]">
                    <td className="px-3.5 py-3">
                      <div className="font-medium text-text">{item.name}</div>
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
                      {formatCurrency(total)}
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
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
