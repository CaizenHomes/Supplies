import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getReceiptSignedUrl } from "@/lib/receipts";
import { HistoryFilter } from "@/components/history-filter";
import { HistoryTable } from "@/components/history-table";

type HistoryStatus = "received" | "rejected" | "cancelled";
const HISTORY_STATUSES: readonly HistoryStatus[] = ["received", "rejected", "cancelled"];

function isHistoryStatus(value: string | undefined): value is HistoryStatus {
  return value === "received" || value === "rejected" || value === "cancelled";
}

export default async function SuppliesHistoryPage({
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
    .eq("module", "supplies")
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
          <h1 className="text-base font-semibold text-text">Supply history</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Received and verified supplies, rejected requests, and cancelled orders.
          </p>
        </div>
        {profile.role === "executive" && (
          <a
            href="/supplies/history/export"
            className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-bg"
          >
            Export CSV
          </a>
        )}
      </div>

      <HistoryFilter basePath="/supplies/history" />

      {history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          <p className="mb-1 text-[15px] font-medium text-text">No history yet</p>
          <p>Received, rejected, and cancelled supply requests appear here.</p>
        </div>
      ) : (
        <HistoryTable items={history} />
      )}
    </section>
  );
}
