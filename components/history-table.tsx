import type { ReactNode } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { buildReceiptRenderUnits } from "@/lib/receipt-groups";
import {
  formatCents,
  groupOrderItems,
  itemCents,
  orderTotals,
  type OrderTaxData,
  type OrderTaxInfo,
} from "@/lib/order-totals";
import { EditTaxModal } from "@/components/orders/edit-tax-modal";
import { OrderTaxInline, OrderTaxLines, showOrderTax } from "@/components/orders/order-tax-summary";
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
      // Only money actually spent counts — cancelled/rejected rows still render, but the
      // database's counts_as_spent flag keeps them out of the subtotal.
      const countedItems = vendorItems.filter((item) => item.counts_as_spent);
      const totals = countedItems.map(rowTotal).filter((total) => total !== null) as number[];
      const subtotal = totals.length > 0 ? totals.reduce((sum, total) => sum + total, 0) : null;
      return { vendor, items: vendorItems, countedCount: countedItems.length, subtotal };
    });
}

type VendorGroup = ReturnType<typeof groupByVendor>[number];

type HistoryOrder = OrderTaxInfo & { countedCount: number };

// Order-level tax for Groceries History. Undefined for Supplies, which then renders exactly
// as it always has.
type TaxContext = {
  canManage: boolean;
  orders: Map<string, HistoryOrder>;
  // The vendor group an order's tax (and its order-level summary) belongs to: the
  // alphabetically first vendor among its counted items, or among all its items if none
  // count. An order whose items span vendors therefore contributes its tax exactly once.
  homeVendor: Map<string, string>;
};

// Built from every item on each order (orderTaxData.orderItems), not just the rows the
// current filter shows, so totals and the home vendor are the same under any filter.
function buildTaxContext({ taxes, orderItems: allOrderItems }: OrderTaxData, canManage: boolean): TaxContext {
  const orders = new Map<string, HistoryOrder>();
  const homeVendor = new Map<string, string>();
  for (const [receiptPath, orderItems] of groupOrderItems(allOrderItems)) {
    const counted = orderItems.filter((item) => item.counts_as_spent);
    const vendors = (counted.length > 0 ? counted : orderItems)
      .map((item) => item.vendor ?? "Unknown vendor")
      .sort((a, b) => a.localeCompare(b));
    homeVendor.set(receiptPath, vendors[0]);

    const tax = taxes[receiptPath];
    orders.set(receiptPath, {
      receiptPath,
      tax,
      totals: orderTotals(orderItems, tax),
      countedCount: counted.length,
    });
  }

  return { canManage, orders, homeVendor };
}

// The order whose tax summary renders in this vendor group, if any.
function orderInGroup(
  receiptPath: string | null,
  vendor: string,
  taxContext: TaxContext | undefined,
): HistoryOrder | undefined {
  if (!taxContext || !receiptPath || taxContext.homeVendor.get(receiptPath) !== vendor) return undefined;
  return taxContext.orders.get(receiptPath);
}

function vendorMoney(group: VendorGroup, taxContext: TaxContext) {
  const subtotalCents = group.items
    .filter((item) => item.counts_as_spent)
    .reduce((sum, item) => sum + (itemCents(item) ?? 0), 0);

  // Only orders with a counted item shown in this group, so the Tax line always matches the
  // rows the current filter displays (e.g. a cancelled-only filter shows $0 tax).
  const shownCountedReceipts = new Set(
    group.items.filter((item) => item.counts_as_spent).map((item) => item.receipt_path),
  );

  let taxCents = 0;
  for (const [receiptPath, vendor] of taxContext.homeVendor) {
    const order = taxContext.orders.get(receiptPath);
    if (vendor === group.vendor && order?.totals.taxCounts && shownCountedReceipts.has(receiptPath)) {
      taxCents += order.totals.gstCents + order.totals.pstCents;
    }
  }

  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

function ReceiptPill({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] font-normal normal-case tracking-normal text-text-muted hover:border-accent hover:text-accent"
    >
      📎 view
    </a>
  );
}

function itemRow(item: HistoryRow, { hideReceipt }: { hideReceipt?: boolean } = {}) {
  const total = rowTotal(item);
  const completedAt = item.checked_at ?? item.rejected_at ?? item.cancelled_at ?? item.requested_at;
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
          <div className="mt-0.5 text-xs text-text-subtle">Reason: {item.cancellation_reason}</div>
        )}
      </td>
      <td className="px-3.5 py-3 text-right tabular-nums">{item.qty}</td>
      <td className="px-3.5 py-3 text-right font-semibold tabular-nums">
        {total === null ? <span className="text-xs font-normal text-text-subtle">—</span> : formatCurrency(total)}
      </td>
      <td className="px-3.5 py-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[status] ?? "bg-bg text-text-muted"}`}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
      </td>
      <td className="px-3.5 py-3">
        {hideReceipt ? null : item.receiptUrl ? (
          <ReceiptPill href={item.receiptUrl} />
        ) : (
          <span className="text-xs text-text-subtle">—</span>
        )}
      </td>
      <td className="px-3.5 py-3 text-[12.5px] text-text">
        {item.checked_by_name ?? <span className="text-xs text-text-subtle">—</span>}
      </td>
      <td className="px-3.5 py-3 text-[12.5px] text-text-muted">{formatDate(item.ordered_at)}</td>
      <td className="px-3.5 py-3 text-[12.5px] text-text-muted">{formatDate(completedAt)}</td>
    </tr>
  );
}

// One line of a footer (order or vendor group) with its amount in the Total column.
function footerRow(
  key: string,
  label: string,
  amount: string,
  { count, emphasis, last, trailing }: { count?: string; emphasis?: boolean; last?: boolean; trailing?: ReactNode } = {},
) {
  const pad = last ? "pb-2 pt-1" : "pb-0 pt-1.5";
  return (
    <tr key={key} className={last ? "border-b border-border bg-bg" : "bg-bg"}>
      <td className={`px-3.5 ${pad} text-xs font-semibold ${emphasis ? "text-text" : "text-text-muted"}`}>{label}</td>
      <td className={`px-3.5 ${pad} text-right text-xs font-semibold tabular-nums text-text-muted`}>{count}</td>
      <td className={`px-3.5 ${pad} text-right text-xs tabular-nums text-text ${emphasis ? "font-semibold" : ""}`}>
        {amount}
      </td>
      <td colSpan={5} className={`px-3.5 ${pad} text-right`}>
        {trailing}
      </td>
    </tr>
  );
}

// Subtotal / GST / PST / Order total under a multi-item order's rows (Groceries only).
function orderFooterRows(key: string, order: HistoryOrder, canManage: boolean) {
  const { totals } = order;
  return [
    footerRow(`${key}__subtotal`, "Subtotal", formatCents(totals.subtotalCents), {
      count: `${order.countedCount} item${order.countedCount === 1 ? "" : "s"}`,
    }),
    footerRow(`${key}__gst`, "GST", formatCents(totals.gstCents)),
    footerRow(`${key}__pst`, "PST", formatCents(totals.pstCents)),
    footerRow(
      `${key}__total`,
      totals.taxCounts ? "Order total" : "Order total (tax not counted — order cancelled)",
      formatCents(totals.totalCents),
      {
        emphasis: true,
        last: true,
        trailing: canManage ? <EditTaxModal receiptPath={order.receiptPath} tax={order.tax} /> : undefined,
      },
    ),
  ];
}

// Mobile card equivalent of itemRow — same data, reflowed vertically.
function itemCard(item: HistoryRow, { hideReceipt }: { hideReceipt?: boolean } = {}) {
  const total = rowTotal(item);
  const completedAt = item.checked_at ?? item.rejected_at ?? item.cancelled_at ?? item.requested_at;
  const status = item.status ?? "";

  return (
    <div key={item.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
            <div className="mt-0.5 text-xs text-text-subtle">Reason: {item.cancellation_reason}</div>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[status] ?? "bg-bg text-text-muted"}`}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-text-muted">
        <span className="tabular-nums">
          Qty {item.qty}
          {total !== null && (
            <>
              {" · "}
              <span className="font-semibold text-text">{formatCurrency(total)}</span>
            </>
          )}
        </span>
        {!hideReceipt && item.receiptUrl && <ReceiptPill href={item.receiptUrl} />}
        {item.checked_by_name && <span>Verified by {item.checked_by_name}</span>}
        {item.ordered_at && <span>Ordered {formatDate(item.ordered_at)}</span>}
        <span>Completed {formatDate(completedAt)}</span>
      </div>
    </div>
  );
}

// Mobile card equivalent of a vendor group — header, nested order sub-groups, subtotal.
function GroupCard({ group, taxContext }: { group: VendorGroup; taxContext?: TaxContext }) {
  const units = buildReceiptRenderUnits(group.items, (item) => item.checked_at);

  return (
    <div className="rounded-lg border border-border bg-bg p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {group.vendor}
      </div>

      <div className="flex flex-col gap-2">
        {units.flatMap((unit) => {
          if (unit.kind === "row") {
            const order = orderInGroup(unit.item.receipt_path, group.vendor, taxContext);
            if (!order || !showOrderTax(order.totals, taxContext!.canManage)) {
              return [itemCard(unit.item)];
            }
            return [
              itemCard(unit.item),
              <div key={`${unit.key}__tax`} className="pl-1">
                <OrderTaxInline
                  totals={order.totals}
                  receiptPath={order.receiptPath}
                  tax={order.tax}
                  canManage={taxContext!.canManage}
                />
              </div>,
            ];
          }

          const receiptUrl = unit.items.find((item) => item.receiptUrl)?.receiptUrl ?? null;
          const order = orderInGroup(unit.key, group.vendor, taxContext);
          return [
            <div
              key={`${unit.key}__sub-header`}
              className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pl-1 text-[10.5px] font-medium text-text-muted"
            >
              <span>Order · {formatDate(unit.date)}</span>
              {receiptUrl && <ReceiptPill href={receiptUrl} />}
            </div>,
            ...unit.items.map((item) => itemCard(item, { hideReceipt: true })),
            ...(order
              ? [
                  <div key={`${unit.key}__tax`} className="pl-1">
                    <OrderTaxLines totals={order.totals} itemCount={order.countedCount} />
                    {taxContext!.canManage && (
                      <div className="mt-1.5">
                        <EditTaxModal receiptPath={order.receiptPath} tax={order.tax} />
                      </div>
                    )}
                  </div>,
                ]
              : []),
          ];
        })}
      </div>

      {taxContext ? (
        <VendorMoneyLines group={group} taxContext={taxContext} />
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs font-semibold text-text-muted">
          <span>
            Subtotal · {group.countedCount} item{group.countedCount === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums text-text">
            {group.subtotal === null ? "—" : formatCurrency(group.subtotal)}
          </span>
        </div>
      )}
    </div>
  );
}

// Mobile vendor-group footer with tax: Subtotal / Tax / Total.
function VendorMoneyLines({ group, taxContext }: { group: VendorGroup; taxContext: TaxContext }) {
  const money = vendorMoney(group, taxContext);
  return (
    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 border-t border-border pt-2 text-xs font-semibold text-text-muted">
      <dt>
        Subtotal · {group.countedCount} item{group.countedCount === 1 ? "" : "s"}
      </dt>
      <dd className="text-right tabular-nums text-text">{formatCents(money.subtotalCents)}</dd>
      <dt>Tax</dt>
      <dd className="text-right tabular-nums text-text">{formatCents(money.taxCents)}</dd>
      <dt className="text-text">Total</dt>
      <dd className="text-right tabular-nums text-text">{formatCents(money.totalCents)}</dd>
    </dl>
  );
}

export function HistoryTable({
  items,
  orderTaxData,
  canManage = false,
  monthTotalLabel,
}: {
  items: HistoryRow[];
  // Order-level GST/PST plus every item on the displayed orders. Only Groceries History
  // passes this; when it's undefined (Supplies) no tax UI renders at all.
  orderTaxData?: OrderTaxData;
  canManage?: boolean;
  // Set when a month is selected (Groceries): renders one total for all shown rows, the sum
  // of the vendor totals. With no status filter it equals that month's budget_spent() minus
  // items still in_list or ordered but not yet received.
  monthTotalLabel?: string;
}) {
  const groups = groupByVendor(items);
  const taxContext = orderTaxData ? buildTaxContext(orderTaxData, canManage) : undefined;
  const monthTotal =
    monthTotalLabel && taxContext
      ? groups.reduce(
          (sum, group) => {
            const money = vendorMoney(group, taxContext);
            return { cents: sum.cents + money.totalCents, count: sum.count + group.countedCount };
          },
          { cents: 0, count: 0 },
        )
      : null;

  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {groups.map((group) => (
          <GroupCard key={group.vendor} group={group} taxContext={taxContext} />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface shadow-sm md:block">
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
              Ordered
            </th>
            <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Completed
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) => {
            const units = buildReceiptRenderUnits(group.items, (item) => item.checked_at);

            const rows = [
              <tr key={`${group.vendor}__header`} className="border-b border-border bg-bg">
                <td
                  colSpan={8}
                  className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted"
                >
                  {group.vendor}
                </td>
              </tr>,
              ...units.flatMap((unit) => {
                if (unit.kind === "row") {
                  const order = orderInGroup(unit.item.receipt_path, group.vendor, taxContext);
                  if (!order || !showOrderTax(order.totals, taxContext!.canManage)) {
                    return [itemRow(unit.item)];
                  }
                  return [
                    itemRow(unit.item),
                    <tr key={`${unit.key}__tax`} className="border-b border-border bg-bg">
                      <td colSpan={8} className="px-3.5 py-2 pl-7">
                        <OrderTaxInline
                          totals={order.totals}
                          receiptPath={order.receiptPath}
                          tax={order.tax}
                          canManage={taxContext!.canManage}
                        />
                      </td>
                    </tr>,
                  ];
                }

                const receiptUrl = unit.items.find((item) => item.receiptUrl)?.receiptUrl ?? null;
                const order = orderInGroup(unit.key, group.vendor, taxContext);
                return [
                  <tr key={`${unit.key}__sub-header`} className="border-b border-border bg-bg">
                    <td
                      colSpan={4}
                      className="px-3.5 py-1 pl-7 text-[10.5px] font-medium normal-case text-text-muted"
                    >
                      Order · {formatDate(unit.date)}
                    </td>
                    <td className="px-3.5 py-1">{receiptUrl && <ReceiptPill href={receiptUrl} />}</td>
                    <td colSpan={3} className="px-3.5 py-1" />
                  </tr>,
                  ...unit.items.map((item) => itemRow(item, { hideReceipt: true })),
                  ...(order ? orderFooterRows(unit.key, order, taxContext!.canManage) : []),
                ];
              }),
              ...(taxContext
                ? (() => {
                    const money = vendorMoney(group, taxContext);
                    return [
                      footerRow(`${group.vendor}__subtotal`, "Subtotal", formatCents(money.subtotalCents), {
                        count: `${group.countedCount} item${group.countedCount === 1 ? "" : "s"}`,
                      }),
                      footerRow(`${group.vendor}__tax`, "Tax", formatCents(money.taxCents)),
                      footerRow(`${group.vendor}__total`, "Total", formatCents(money.totalCents), {
                        emphasis: true,
                        last: true,
                      }),
                    ];
                  })()
                : [
                    <tr key={`${group.vendor}__subtotal`} className="border-b border-border bg-bg">
                      <td className="px-3.5 py-2 text-xs font-semibold text-text-muted">Subtotal</td>
                      <td className="px-3.5 py-2 text-right text-xs font-semibold tabular-nums text-text-muted">
                        {group.countedCount} item{group.countedCount === 1 ? "" : "s"}
                      </td>
                      <td className="px-3.5 py-2 text-right text-xs font-semibold tabular-nums text-text">
                        {group.subtotal === null ? "—" : formatCurrency(group.subtotal)}
                      </td>
                      <td colSpan={5} className="px-3.5 py-2" />
                    </tr>,
                  ]),
            ];
            return rows;
          })}
        </tbody>
      </table>
      </div>

      {monthTotal && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 text-sm shadow-sm">
          <span className="font-semibold text-text">
            {monthTotalLabel}
            <span className="ml-1.5 text-xs font-normal text-text-muted">
              · {monthTotal.count} item{monthTotal.count === 1 ? "" : "s"}, incl. tax
            </span>
          </span>
          <span className="font-semibold tabular-nums text-text">{formatCents(monthTotal.cents)}</span>
        </div>
      )}
    </>
  );
}
