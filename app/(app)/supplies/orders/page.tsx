import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getReceiptSignedUrl } from "@/lib/receipts";
import { formatCurrency, initials } from "@/lib/format";
import { MarkOrderedModal } from "@/components/orders/mark-ordered-modal";
import { MarkReceivedModal } from "@/components/orders/mark-received-modal";
import { CancelButton } from "@/components/orders/cancel-button";

const ORDER_STATUSES = ["in_list", "ordered"] as const;

const STATUS_ORDER: Record<string, number> = {
  in_list: 0,
  ordered: 1,
};

const STATUS_LABEL: Record<string, string> = {
  in_list: "In list",
  ordered: "Ordered",
};

const STATUS_CLASS: Record<string, string> = {
  in_list: "bg-info-soft text-info",
  ordered: "bg-[#f4ebff] text-[#6941c6]",
};

export default async function SuppliesOrdersPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const canManage = profile.role === "manager" || profile.role === "executive";

  const [{ data: items }, { data: activeProfiles }] = await Promise.all([
    supabase
      .from("items_detailed")
      .select("*")
      .eq("module", "supplies")
      .in("status", ORDER_STATUSES),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  const sorted = (items ?? []).sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status ?? ""] ?? 99) - (STATUS_ORDER[b.status ?? ""] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return (b.requested_at ?? "").localeCompare(a.requested_at ?? "");
  });

  const orders = await Promise.all(
    sorted.map(async (item) => ({
      ...item,
      receiptUrl: item.receipt_path ? await getReceiptSignedUrl(item.receipt_path) : null,
    })),
  );

  return (
    <section>
      <div className="mb-4">
        <h1 className="text-base font-semibold text-text">Order list</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Approved supplies waiting to be purchased, ordered but not yet received, or awaiting
          verification.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          <p className="mb-1 text-[15px] font-medium text-text">Nothing on the order list yet</p>
          <p>Approved requests move here automatically.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
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
                        <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                          {initials(requesterName)}
                        </span>
                        {item.vendor} · requested by {requesterName}
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
                              currentUserId={profile.id}
                              activeProfiles={activeProfiles ?? []}
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
      )}
    </section>
  );
}
