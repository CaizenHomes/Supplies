"use client";

import { useState } from "react";
import { formatCurrency, initials } from "@/lib/format";
import { MarkOrderedModal } from "@/components/orders/mark-ordered-modal";
import { MarkReceivedModal } from "@/components/orders/mark-received-modal";
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

  const inListIds = orders
    .filter((order) => selected.has(order.id!) && order.status === "in_list")
    .map((order) => order.id!);
  const orderedIds = orders
    .filter((order) => selected.has(order.id!) && order.status === "ordered")
    .map((order) => order.id!);

  return (
    <>
      {canManage && selected.size > 0 && (
        <BulkActionBar
          inListIds={inListIds}
          orderedIds={orderedIds}
          currentUserId={currentUserId}
          activeProfiles={activeProfiles}
          onDone={() => setSelected(new Set())}
        />
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
            {orders.map((item) => {
              const total = item.unit_price === null ? null : (item.qty ?? 0) * item.unit_price;
              const requesterName = item.requested_by_name ?? "Unknown";
              const status = item.status ?? "";
              const requestedLabel = module === "groceries" ? "wished by" : "requested by";

              return (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-[#fafbfc]">
                  {canManage && (
                    <td className="px-3.5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id!)}
                        onChange={() => toggle(item.id!)}
                        className="h-4 w-4 rounded border-border-strong accent-accent"
                        aria-label={`Select ${item.name}`}
                      />
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
                    {total === null ? (
                      <span className="text-xs font-normal text-text-subtle">—</span>
                    ) : (
                      formatCurrency(total)
                    )}
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
                  <td className="px-3.5 py-3 text-right">
                    {canManage ? (
                      <div className="flex items-center justify-end gap-2">
                        {status === "in_list" && <MarkOrderedModal itemId={item.id!} />}
                        {status === "ordered" && (
                          <MarkReceivedModal
                            itemId={item.id!}
                            currentUserId={currentUserId}
                            activeProfiles={activeProfiles}
                          />
                        )}
                        <CancelButton itemId={item.id!} itemName={item.name ?? "this item"} />
                      </div>
                    ) : (
                      <span className="text-xs text-text-subtle">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
