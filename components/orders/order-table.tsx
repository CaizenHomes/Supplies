"use client";

import { useState, type ReactNode } from "react";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { buildReceiptRenderUnits } from "@/lib/receipt-groups";
import { MarkOrderedModal } from "@/components/orders/mark-ordered-modal";
import { MarkReceivedButton } from "@/components/orders/mark-received-button";
import { CancelButton } from "@/components/orders/cancel-button";
import { BulkActionBar } from "@/components/orders/bulk-action-bar";
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
}: {
  module: "groceries" | "supplies";
  orders: OrderRow[];
  canManage: boolean;
  currentUserId: string;
  activeProfiles: ActiveProfile[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
  const columnCount = canManage ? 8 : 7;

  return (
    <>
      {canManage && selectedIds.length > 0 && (
        <BulkActionBar selectedIds={selectedIds} onDone={() => setSelected(new Set())} />
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
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
                      <MarkOrderedModal itemId={item.id!} />
                      <CancelButton itemId={item.id!} itemName={item.name ?? "this item"} />
                    </>
                  ) : null
                }
                showReceipt
              />
            ))}

            {orderedUnits.map((unit) =>
              unit.kind === "row" ? (
                <ItemRow
                  key={unit.key}
                  item={unit.item}
                  module={module}
                  canManage={canManage}
                  actions={
                    canManage ? (
                      <>
                        <MarkReceivedButton
                          itemIds={[unit.item.id!]}
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
                <GroupRows
                  key={unit.key}
                  items={unit.items}
                  date={unit.date}
                  module={module}
                  canManage={canManage}
                  currentUserId={currentUserId}
                  activeProfiles={activeProfiles}
                  columnCount={columnCount}
                />
              ),
            )}
          </tbody>
        </table>
      </div>
    </>
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
        {showReceipt && item.receiptUrl ? (
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
  columnCount,
}: {
  items: OrderRow[];
  date: string | null;
  module: "groceries" | "supplies";
  canManage: boolean;
  currentUserId: string;
  activeProfiles: ActiveProfile[];
  columnCount: number;
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
    <>
      <tr className="border-b border-border bg-bg">
        <td colSpan={columnCount} className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          {vendorLabel} order · {formatDate(date)}
          {receiptUrl && (
            <>
              {" · "}
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="normal-case tracking-normal text-accent hover:underline"
              >
                📎 view receipt
              </a>
            </>
          )}
        </td>
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
          {canManage && (
            <MarkReceivedButton
              itemIds={itemIds}
              currentUserId={currentUserId}
              activeProfiles={activeProfiles}
              label="Mark received"
            />
          )}
        </td>
      </tr>
    </>
  );
}
