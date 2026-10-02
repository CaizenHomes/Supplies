"use client";

import { Fragment, useState, type ReactNode } from "react";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { buildReceiptRenderUnits } from "@/lib/receipt-groups";
import {
  formatCents,
  groupOrderItems,
  orderTotals,
  type OrderTaxData,
  type OrderTaxInfo,
} from "@/lib/order-totals";
import { MarkOrderedModal } from "@/components/orders/mark-ordered-modal";
import { MarkReceivedButton } from "@/components/orders/mark-received-button";
import { CancelButton } from "@/components/orders/cancel-button";
import { BulkActionBar } from "@/components/orders/bulk-action-bar";
import { EditTaxModal } from "@/components/orders/edit-tax-modal";
import { OrderTaxInline, OrderTaxLines, showOrderTax } from "@/components/orders/order-tax-summary";
import type { Tables } from "@/lib/types";

type OrderRow = Tables<"items_detailed"> & { receiptUrl: string | null };
type ActiveProfile = { id: string; full_name: string };

const STATUS_LABEL: Record<string, string> = {
  in_list: "In list",
  ordered: "Ordered",
};

const STATUS_CLASS: Record<string, string> = {
  in_list: "bg-info-soft text-info",
  ordered: "bg-[#f4ebff] text-[#6941c6]",
};

function rowTotal(item: OrderRow): number | null {
  return item.unit_price === null ? null : (item.qty ?? 0) * item.unit_price;
}

export function OrderTable({
  module,
  orders,
  canManage,
  currentUserId,
  activeProfiles,
  orderTaxData,
}: {
  module: "groceries" | "supplies";
  orders: OrderRow[];
  canManage: boolean;
  currentUserId: string;
  activeProfiles: ActiveProfile[];
  // Order-level GST/PST plus every item on the displayed orders. Only the Groceries page
  // passes this; when it's undefined (Supplies) no order-level tax UI renders at all.
  orderTaxData?: OrderTaxData;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Order totals are computed per receipt from all of the order's items (not per rendered
  // row), so an order whose other items were cancelled still shows its full tax.
  const itemsByReceipt = groupOrderItems(orderTaxData?.orderItems ?? []);

  // Undefined for a fully cancelled or rejected order (no item counts as spent): its tax
  // doesn't count, so no tax UI renders for it.
  function orderTaxInfo(receiptPath: string | null): OrderTaxInfo | undefined {
    if (!orderTaxData || !receiptPath) return undefined;
    const tax = orderTaxData.taxes[receiptPath];
    const totals = orderTotals(itemsByReceipt.get(receiptPath) ?? [], tax);
    return totals.taxCounts ? { receiptPath, tax, totals } : undefined;
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const inListItems = orders.filter((order) => order.status === "in_list");
  const orderedItems = orders.filter((order) => order.status === "ordered");
  const orderedUnits = buildReceiptRenderUnits(orderedItems, (item) => item.ordered_at);
  const selectedIds = inListItems.filter((item) => selected.has(item.id!)).map((item) => item.id!);

  return (
    <>
      {canManage && selectedIds.length > 0 && (
        <BulkActionBar module={module} selectedIds={selectedIds} onDone={() => setSelected(new Set())} />
      )}

      <div className="flex flex-col gap-3 md:hidden">
        {inListItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            module={module}
            checkbox={
              canManage ? { checked: selected.has(item.id!), onToggle: () => toggle(item.id!) } : undefined
            }
            actions={
              canManage ? (
                <>
                  <MarkOrderedModal itemId={item.id!} module={module} />
                  <CancelButton itemId={item.id!} itemName={item.name ?? "this item"} />
                </>
              ) : null
            }
            showReceipt
          />
        ))}

        {orderedUnits.map((unit) =>
          unit.kind === "row" ? (
            <ItemCard
              key={unit.key}
              item={unit.item}
              module={module}
              footer={singleOrderTax(orderTaxInfo(unit.item.receipt_path), canManage)}
              actions={
                canManage ? (
                  <>
                    <MarkReceivedButton
                      itemIds={[unit.item.id!]}
                      itemName={unit.item.name ?? undefined}
                      module={module}
                      currentUserId={currentUserId}
                      activeProfiles={activeProfiles}
                    />
                    <CancelButton itemId={unit.item.id!} itemName={unit.item.name ?? "this item"} />
                  </>
                ) : null
              }
              showReceipt
            />
          ) : (
            <GroupCards
              key={unit.key}
              items={unit.items}
              date={unit.date}
              module={module}
              canManage={canManage}
              currentUserId={currentUserId}
              activeProfiles={activeProfiles}
              orderTax={orderTaxInfo(unit.key)}
            />
          ),
        )}

        {inListItems.length === 0 && orderedUnits.length === 0 && (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-text-muted">
            No items here.
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface shadow-sm md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[#fafbfc]">
              {canManage && <th className="w-8 px-3.5 py-2.5" />}
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
              <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {inListItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                module={module}
                canManage={canManage}
                checkbox={
                  canManage ? { checked: selected.has(item.id!), onToggle: () => toggle(item.id!) } : undefined
                }
                actions={
                  canManage ? (
                    <>
                      <MarkOrderedModal itemId={item.id!} module={module} />
                      <CancelButton itemId={item.id!} itemName={item.name ?? "this item"} />
                    </>
                  ) : null
                }
                showReceipt
              />
            ))}

            {orderedUnits.map((unit) => {
              if (unit.kind === "group") {
                return (
                  <GroupRows
                    key={unit.key}
                    items={unit.items}
                    date={unit.date}
                    module={module}
                    canManage={canManage}
                    currentUserId={currentUserId}
                    activeProfiles={activeProfiles}
                    orderTax={orderTaxInfo(unit.key)}
                  />
                );
              }

              const taxSummary = singleOrderTax(orderTaxInfo(unit.item.receipt_path), canManage);
              return (
                <Fragment key={unit.key}>
                  <ItemRow
                    item={unit.item}
                    module={module}
                    canManage={canManage}
                    actions={
                      canManage ? (
                        <>
                          <MarkReceivedButton
                            itemIds={[unit.item.id!]}
                            itemName={unit.item.name ?? undefined}
                            module={module}
                            currentUserId={currentUserId}
                            activeProfiles={activeProfiles}
                          />
                          <CancelButton itemId={unit.item.id!} itemName={unit.item.name ?? "this item"} />
                        </>
                      ) : null
                    }
                    showReceipt
                  />
                  {taxSummary && (
                    <tr className="border-b border-border bg-bg">
                      {canManage && <td className="px-3.5 py-2" />}
                      <td colSpan={7} className="px-3.5 py-2">
                        {taxSummary}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
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

// Order-level summary for an order rendered as a single item row/card; null when there's
// nothing to show (Supplies, or no tax entered and the viewer can't add it).
function singleOrderTax(info: OrderTaxInfo | undefined, canManage: boolean): ReactNode {
  if (!info || !showOrderTax(info.totals, canManage)) return null;
  return (
    <OrderTaxInline totals={info.totals} receiptPath={info.receiptPath} tax={info.tax} canManage={canManage} />
  );
}

function ItemRow({
  item,
  module,
  canManage,
  checkbox,
  actions,
  showReceipt,
}: {
  item: OrderRow;
  module: "groceries" | "supplies";
  canManage: boolean;
  checkbox?: { checked: boolean; onToggle: () => void };
  actions: ReactNode;
  showReceipt: boolean;
}) {
  const total = rowTotal(item);
  const requesterName = item.requested_by_name ?? "Unknown";
  const status = item.status ?? "";
  const requestedLabel = module === "groceries" ? "wished by" : "requested by";

  return (
    <tr className="border-b border-border last:border-0 hover:bg-[#fafbfc]">
      {canManage && (
        <td className="px-3.5 py-3">
          {checkbox && (
            <input
              type="checkbox"
              checked={checkbox.checked}
              onChange={checkbox.onToggle}
              className="h-4 w-4 rounded border-border-strong accent-accent"
              aria-label={`Select ${item.name}`}
            />
          )}
        </td>
      )}
      <td className="px-3.5 py-3">
        <div className="font-medium text-text">
          {item.name}
          {module === "supplies" && item.urgency === "urgent" && (
            <span className="ml-1.5 inline-block rounded-full bg-danger-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-danger">
              Urgent
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-text-muted">
          <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
            {initials(requesterName)}
          </span>
          {item.vendor} · {requestedLabel} {requesterName}
          {item.link && (
            <>
              {" · "}
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                🔗 link
              </a>
            </>
          )}
        </div>
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
        {!showReceipt ? null : item.receiptUrl ? (
          <ReceiptPill href={item.receiptUrl} />
        ) : (
          <span className="text-xs text-text-subtle">—</span>
        )}
      </td>
      <td className="px-3.5 py-3 text-[12.5px] text-text">
        {item.checked_by_name ?? <span className="text-xs text-text-subtle">—</span>}
      </td>
      <td className="px-3.5 py-3 text-right">
        {actions ? (
          <div className="flex items-center justify-end gap-2">{actions}</div>
        ) : (
          <span className="text-xs text-text-subtle">—</span>
        )}
      </td>
    </tr>
  );
}

function GroupRows({
  items,
  date,
  module,
  canManage,
  currentUserId,
  activeProfiles,
  orderTax,
}: {
  items: OrderRow[];
  date: string | null;
  module: "groceries" | "supplies";
  canManage: boolean;
  currentUserId: string;
  activeProfiles: ActiveProfile[];
  orderTax?: OrderTaxInfo;
}) {
  const vendors = new Set(items.map((item) => item.vendor ?? "Unknown vendor"));
  const vendorLabel = vendors.size > 1 ? "Multiple vendors" : (items[0].vendor ?? "Unknown vendor");
  const receiptUrl = items.find((item) => item.receiptUrl)?.receiptUrl ?? null;
  const totals = items.map(rowTotal);
  const subtotal = totals.every((total) => total !== null)
    ? (totals as number[]).reduce((sum, total) => sum + total, 0)
    : null;
  const itemIds = items.map((item) => item.id!);
  const markReceived = canManage && (
    <MarkReceivedButton
      itemIds={itemIds}
      module={module}
      currentUserId={currentUserId}
      activeProfiles={activeProfiles}
      label="Mark received"
    />
  );

  return (
    <>
      <tr className="border-b border-border bg-bg">
        {canManage && <td className="px-3.5 py-1.5" />}
        <td colSpan={4} className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          {vendorLabel} order · {formatDate(date)}
        </td>
        <td className="px-3.5 py-1.5">{receiptUrl && <ReceiptPill href={receiptUrl} />}</td>
        <td colSpan={2} className="px-3.5 py-1.5" />
      </tr>

      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          module={module}
          canManage={canManage}
          actions={canManage ? <CancelButton itemId={item.id!} itemName={item.name ?? "this item"} /> : null}
          showReceipt={false}
        />
      ))}

      {orderTax ? (
        <>
          <OrderFooterRow canManage={canManage} label="Subtotal" count={`${items.length} items`}>
            {formatCents(orderTax.totals.subtotalCents)}
          </OrderFooterRow>
          <OrderFooterRow canManage={canManage} label="GST">
            {formatCents(orderTax.totals.gstCents)}
          </OrderFooterRow>
          <OrderFooterRow canManage={canManage} label="PST">
            {formatCents(orderTax.totals.pstCents)}
          </OrderFooterRow>
          <tr className="border-b border-border bg-bg">
            {canManage && <td className="px-3.5 pb-2 pt-1" />}
            <td className="px-3.5 pb-2 pt-1 text-xs font-semibold text-text">Order total</td>
            <td className="px-3.5 pb-2 pt-1" />
            <td className="px-3.5 pb-2 pt-1 text-right text-xs font-semibold tabular-nums text-text">
              {formatCents(orderTax.totals.totalCents)}
            </td>
            <td colSpan={4} className="px-3.5 pb-2 pt-1 text-right">
              {canManage && (
                <div className="flex items-center justify-end gap-2">
                  <EditTaxModal receiptPath={orderTax.receiptPath} tax={orderTax.tax} />
                  {markReceived}
                </div>
              )}
            </td>
          </tr>
        </>
      ) : (
        <tr className="border-b border-border bg-bg">
          {canManage && <td className="px-3.5 py-2" />}
          <td className="px-3.5 py-2 text-xs font-semibold text-text-muted">Subtotal</td>
          <td className="px-3.5 py-2 text-right text-xs font-semibold tabular-nums text-text-muted">
            {items.length} items
          </td>
          <td className="px-3.5 py-2 text-right text-xs font-semibold tabular-nums text-text">
            {subtotal === null ? "—" : formatCurrency(subtotal)}
          </td>
          <td colSpan={4} className="px-3.5 py-2 text-right">
            {markReceived}
          </td>
        </tr>
      )}
    </>
  );
}

// One Subtotal/GST/PST line of a multi-item order's footer, amount in the Total column.
function OrderFooterRow({
  canManage,
  label,
  count,
  children,
}: {
  canManage: boolean;
  label: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <tr className="bg-bg">
      {canManage && <td className="px-3.5 pb-0 pt-1.5" />}
      <td className="px-3.5 pb-0 pt-1.5 text-xs font-semibold text-text-muted">{label}</td>
      <td className="px-3.5 pb-0 pt-1.5 text-right text-xs font-semibold tabular-nums text-text-muted">
        {count}
      </td>
      <td className="px-3.5 pb-0 pt-1.5 text-right text-xs tabular-nums text-text">{children}</td>
      <td colSpan={4} className="px-3.5 pb-0 pt-1.5" />
    </tr>
  );
}

// Mobile card equivalent of ItemRow — same data and actions, reflowed for narrow screens.
function ItemCard({
  item,
  module,
  checkbox,
  actions,
  showReceipt,
  footer,
}: {
  item: OrderRow;
  module: "groceries" | "supplies";
  checkbox?: { checked: boolean; onToggle: () => void };
  actions: ReactNode;
  showReceipt: boolean;
  // Order-level tax summary when this card is a whole single-item order (Groceries only).
  footer?: ReactNode;
}) {
  const total = rowTotal(item);
  const requesterName = item.requested_by_name ?? "Unknown";
  const status = item.status ?? "";
  const requestedLabel = module === "groceries" ? "wished by" : "requested by";

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {checkbox && (
          <input
            type="checkbox"
            checked={checkbox.checked}
            onChange={checkbox.onToggle}
            className="mt-1 h-5 w-5 shrink-0 rounded border-border-strong accent-accent"
            aria-label={`Select ${item.name}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium text-text">
                {item.name}
                {module === "supplies" && item.urgency === "urgent" && (
                  <span className="ml-1.5 inline-block rounded-full bg-danger-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-danger">
                    Urgent
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-text-muted">
                <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                  {initials(requesterName)}
                </span>
                {item.vendor} · {requestedLabel} {requesterName}
                {item.link && (
                  <>
                    {" · "}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      🔗 link
                    </a>
                  </>
                )}
              </div>
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
            {showReceipt && item.receiptUrl && <ReceiptPill href={item.receiptUrl} />}
            {item.checked_by_name && <span>Verified by {item.checked_by_name}</span>}
          </div>

          {footer && <div className="mt-2">{footer}</div>}

          {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

// Mobile card equivalent of GroupRows — a receipt-group of item cards with a vendor/date
// header and a subtotal footer, matching what the desktop grouped table row shows.
function GroupCards({
  items,
  date,
  module,
  canManage,
  currentUserId,
  activeProfiles,
  orderTax,
}: {
  items: OrderRow[];
  date: string | null;
  module: "groceries" | "supplies";
  canManage: boolean;
  currentUserId: string;
  activeProfiles: ActiveProfile[];
  orderTax?: OrderTaxInfo;
}) {
  const vendors = new Set(items.map((item) => item.vendor ?? "Unknown vendor"));
  const vendorLabel = vendors.size > 1 ? "Multiple vendors" : (items[0].vendor ?? "Unknown vendor");
  const receiptUrl = items.find((item) => item.receiptUrl)?.receiptUrl ?? null;
  const totals = items.map(rowTotal);
  const subtotal = totals.every((total) => total !== null)
    ? (totals as number[]).reduce((sum, total) => sum + total, 0)
    : null;
  const itemIds = items.map((item) => item.id!);

  return (
    <div className="rounded-lg border border-border bg-bg p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        <span>
          {vendorLabel} order · {formatDate(date)}
        </span>
        {receiptUrl && <ReceiptPill href={receiptUrl} />}
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            module={module}
            actions={canManage ? <CancelButton itemId={item.id!} itemName={item.name ?? "this item"} /> : null}
            showReceipt={false}
          />
        ))}
      </div>

      {orderTax ? (
        <div className="mt-2 border-t border-border pt-2">
          <OrderTaxLines totals={orderTax.totals} itemCount={items.length} />
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs font-semibold text-text-muted">
          <span>Subtotal · {items.length} items</span>
          <span className="tabular-nums text-text">{subtotal === null ? "—" : formatCurrency(subtotal)}</span>
        </div>
      )}

      {canManage && (
        <div className={orderTax ? "mt-2 flex flex-wrap items-center gap-2" : "mt-2"}>
          {orderTax && <EditTaxModal receiptPath={orderTax.receiptPath} tax={orderTax.tax} />}
          <MarkReceivedButton
            itemIds={itemIds}
            module={module}
            currentUserId={currentUserId}
            activeProfiles={activeProfiles}
            label="Mark received"
          />
        </div>
      )}
    </div>
  );
}
