import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductDetail, type PriceTrend } from "@/lib/products";
import { formatCurrency, formatDate } from "@/lib/format";
import { EditProductModal } from "@/components/inventory/edit-product-modal";

const STATUS_LABEL: Record<string, string> = {
  wishlist: "Wishlist",
  pending_approval: "Pending approval",
  in_list: "In list",
  ordered: "Ordered",
  received: "Received",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<string, string> = {
  wishlist: "bg-bg text-text-muted",
  pending_approval: "bg-warning-soft text-warning",
  in_list: "bg-info-soft text-info",
  ordered: "bg-[#f4ebff] text-[#6941c6]",
  received: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
  cancelled: "bg-bg text-text-muted",
};

const TREND_DISPLAY: Record<PriceTrend, { icon: string; className: string; label: string }> = {
  up: { icon: "↑", className: "text-danger", label: "Trending up" },
  down: { icon: "↓", className: "text-success", label: "Trending down" },
  flat: { icon: "→", className: "text-text-muted", label: "Flat" },
  unknown: { icon: "—", className: "text-text-subtle", label: "Not enough data yet" },
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getProductDetail(id);
  if (!detail) {
    notFound();
  }

  const { product, recentOrders, timesOrdered, averagePrice, latestPrice, trend } = detail;
  const trendDisplay = TREND_DISPLAY[trend];

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href="/inventory/products" className="text-sm text-text-muted hover:text-text">
          ← Products
        </Link>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-lg font-semibold text-text">{product.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {product.default_vendor ?? "No default vendor"}
            {" · "}
            {product.default_unit_price != null
              ? formatCurrency(product.default_unit_price)
              : "No default price"}
            {" · Barcode "}
            {product.barcode ?? "—"}
            {" · Category "}
            {product.category ?? "—"}
          </p>
        </div>
        <EditProductModal product={product} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Times ordered" value={String(timesOrdered)} />
        <StatCard
          label="Average price"
          value={averagePrice != null ? formatCurrency(averagePrice) : "—"}
        />
        <StatCard
          label="Latest price"
          value={latestPrice != null ? formatCurrency(latestPrice) : "—"}
          suffix={
            <span className={`ml-2 text-base font-semibold ${trendDisplay.className}`} title={trendDisplay.label}>
              {trendDisplay.icon}
            </span>
          }
        />
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-text">Last 5 orders</h2>
        {recentOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface p-8 text-center text-text-muted">
            No items linked to this product yet.
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-border bg-surface shadow-sm md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-[#fafbfc]">
                    <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Date
                    </th>
                    <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Qty
                    </th>
                    <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Unit price
                    </th>
                    <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Total
                    </th>
                    <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const total = order.unit_price === null ? null : order.qty * order.unit_price;
                    return (
                      <tr key={order.id} className="border-b border-border last:border-0">
                        <td className="px-3.5 py-3 text-text">{formatDate(order.requested_at)}</td>
                        <td className="px-3.5 py-3 text-right tabular-nums">{order.qty}</td>
                        <td className="px-3.5 py-3 text-right tabular-nums">
                          {order.unit_price != null ? (
                            formatCurrency(order.unit_price)
                          ) : (
                            <span className="text-text-subtle">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right font-semibold tabular-nums">
                          {total !== null ? (
                            formatCurrency(total)
                          ) : (
                            <span className="text-text-subtle">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                              STATUS_CLASS[order.status] ?? "bg-bg text-text-muted"
                            }`}
                          >
                            {STATUS_LABEL[order.status] ?? order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {recentOrders.map((order) => {
                const total = order.unit_price === null ? null : order.qty * order.unit_price;
                return (
                  <div key={order.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-text">{formatDate(order.requested_at)}</span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          STATUS_CLASS[order.status] ?? "bg-bg text-text-muted"
                        }`}
                      >
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-sm">
                      <span className="text-text-muted">
                        {order.qty} ×{" "}
                        {order.unit_price != null ? (
                          formatCurrency(order.unit_price)
                        ) : (
                          <span className="text-text-subtle">—</span>
                        )}
                      </span>
                      <span className="font-semibold tabular-nums text-text">
                        {total !== null ? formatCurrency(total) : <span className="text-text-subtle">—</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-text">
        {value}
        {suffix}
      </p>
    </div>
  );
}
