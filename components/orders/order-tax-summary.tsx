import { EditTaxModal } from "@/components/orders/edit-tax-modal";
import { formatCents, type OrderTax, type OrderTotals } from "@/lib/order-totals";

// Order-level money (Groceries only) shared by the Order List and History tables.
// Staff see an order's breakdown only once tax has been entered; managers/executives
// always see it so they can add tax.
export function showOrderTax(totals: OrderTotals, canManage: boolean): boolean {
  return totals.hasTax || canManage;
}

// One-line summary for a single-item order (desktop sub-row and mobile card).
export function OrderTaxInline({
  totals,
  receiptPath,
  tax,
  canManage,
}: {
  totals: OrderTotals;
  receiptPath: string;
  tax: OrderTax | undefined;
  canManage: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-muted">
      {totals.hasTax ? (
        <span className="tabular-nums">
          Subtotal {formatCents(totals.subtotalCents)} · GST {formatCents(totals.gstCents)} · PST{" "}
          {formatCents(totals.pstCents)} ·{" "}
          <span className="font-semibold text-text">Order total {formatCents(totals.totalCents)}</span>
          {!totals.taxCounts && <span className="text-text-subtle"> · tax not counted (order cancelled)</span>}
        </span>
      ) : (
        <span>No tax entered</span>
      )}
      {canManage && <EditTaxModal receiptPath={receiptPath} tax={tax} />}
    </div>
  );
}

// Stacked Subtotal / GST / PST / Order total lines for a multi-item order on mobile.
export function OrderTaxLines({ totals, itemCount }: { totals: OrderTotals; itemCount: number }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 text-xs text-text-muted">
      <dt>Subtotal · {itemCount} items</dt>
      <dd className="text-right tabular-nums">{formatCents(totals.subtotalCents)}</dd>
      <dt>GST</dt>
      <dd className="text-right tabular-nums">{formatCents(totals.gstCents)}</dd>
      <dt>PST</dt>
      <dd className="text-right tabular-nums">{formatCents(totals.pstCents)}</dd>
      <dt className="font-semibold text-text">Order total</dt>
      <dd className="text-right font-semibold tabular-nums text-text">{formatCents(totals.totalCents)}</dd>
      {!totals.taxCounts && totals.hasTax && (
        <dd className="col-span-2 text-text-subtle">Tax not counted (order cancelled)</dd>
      )}
    </dl>
  );
}
