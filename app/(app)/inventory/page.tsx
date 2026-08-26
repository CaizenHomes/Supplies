import { getInventoryData, type ModuleTotals } from "@/lib/inventory";
import { formatCurrency } from "@/lib/format";
import { MonthlyChart } from "@/components/inventory/monthly-chart";
import { MonthlyBreakdownTable } from "@/components/inventory/monthly-breakdown-table";

export default async function InventoryPage() {
  // Role gate lives in the shared inventory layout — anyone who reaches this page has
  // already been confirmed manager/executive.
  const { thisMonth, ytd, monthlyGroceries, monthlySupplies, monthlyBreakdown } =
    await getInventoryData();

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="text-base font-semibold text-text">Inventory</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Spend across received Groceries and Supplies orders.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SpendCard title="This month" totals={thisMonth} />
        <SpendCard title="Year to date" totals={ytd} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MonthlyChart title="Groceries — last 12 months" moduleLabel="Groceries" data={monthlyGroceries} />
        <MonthlyChart title="Supplies — last 12 months" moduleLabel="Supplies" data={monthlySupplies} />
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-text">Monthly breakdown</h2>
        <MonthlyBreakdownTable rows={monthlyBreakdown} />
      </div>
    </section>
  );
}

function SpendCard({ title, totals }: { title: string; totals: ModuleTotals }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <p className="text-sm text-text-muted">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-text">{formatCurrency(totals.total)}</p>
      <div className="mt-3 flex gap-4 text-sm text-text-muted">
        <span>
          Groceries <span className="font-medium text-text">{formatCurrency(totals.groceries)}</span>
        </span>
        <span>
          Supplies <span className="font-medium text-text">{formatCurrency(totals.supplies)}</span>
        </span>
      </div>
    </div>
  );
}
