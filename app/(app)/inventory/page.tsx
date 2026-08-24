import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { getInventoryData, type ModuleTotals } from "@/lib/inventory";
import { formatCurrency } from "@/lib/format";
import { MonthlyChart } from "@/components/inventory/monthly-chart";

export default async function InventoryPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.role !== "executive" && profile.role !== "manager") {
    redirect("/groceries/wishlist");
  }

  const { thisMonth, ytd, monthlyGroceries, monthlySupplies, topVendors } = await getInventoryData();

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
        <MonthlyChart title="Groceries — last 12 months" data={monthlyGroceries} />
        <MonthlyChart title="Supplies — last 12 months" data={monthlySupplies} />
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-text">Top 5 vendors (all-time)</h2>
        {topVendors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface p-8 text-center text-text-muted">
            No received orders yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-[#fafbfc]">
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Vendor
                  </th>
                  <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Total spend
                  </th>
                </tr>
              </thead>
              <tbody>
                {topVendors.map((vendor) => (
                  <tr key={vendor.vendor} className="border-b border-border last:border-0">
                    <td className="px-3.5 py-3 font-medium text-text">{vendor.vendor}</td>
                    <td className="px-3.5 py-3 text-right font-semibold tabular-nums text-text">
                      {formatCurrency(vendor.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
