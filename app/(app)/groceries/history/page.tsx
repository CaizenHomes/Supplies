import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { getReceiptSignedUrl } from "@/lib/receipts";
import { getOrderTaxData } from "@/lib/order-taxes";
import { getHistoryItems, historyFiltersQuery, parseHistoryFilters } from "@/lib/history";
import { monthLabel } from "@/lib/history-month";
import { HistoryFilter } from "@/components/history-filter";
import { HistoryMonthCaption, HistoryNoMatches } from "@/components/history-notes";
import { HistoryTable } from "@/components/history-table";

export default async function GroceriesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const filters = parseHistoryFilters(await searchParams);
  const { items, months, hasAny } = await getHistoryItems("groceries", filters);

  const [history, orderTaxData] = await Promise.all([
    Promise.all(
      items.map(async (item) => ({
        ...item,
        receiptUrl: item.receipt_path ? await getReceiptSignedUrl(item.receipt_path) : null,
      })),
    ),
    getOrderTaxData(items.map((item) => item.receipt_path)),
  ]);
  const canManage = profile.role === "manager" || profile.role === "executive";

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-text">Order history</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Received and verified items, rejected requests, and cancelled orders.
          </p>
        </div>
        {profile.role === "executive" && (
          <a
            href={`/groceries/history/export${historyFiltersQuery(filters)}`}
            className="flex min-h-11 items-center rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-bg sm:min-h-0"
          >
            Export CSV
          </a>
        )}
      </div>

      <HistoryFilter basePath="/groceries/history" months={months} />
      {filters.month && <HistoryMonthCaption month={filters.month} />}

      {!hasAny ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          <p className="mb-1 text-[15px] font-medium text-text">No history yet</p>
          <p>Received, rejected, and cancelled items appear here.</p>
        </div>
      ) : history.length === 0 ? (
        <HistoryNoMatches basePath="/groceries/history" />
      ) : (
        <HistoryTable
          items={history}
          orderTaxData={orderTaxData}
          canManage={canManage}
          monthTotalLabel={filters.month ? `${monthLabel(filters.month)} total` : undefined}
        />
      )}
    </section>
  );
}
