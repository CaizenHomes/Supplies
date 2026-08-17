import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { AddSupplyModal } from "./add-supply-modal";
import { WithdrawButton } from "./withdraw-button";

export default async function SuppliesRequestsPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const canManage = profile.role === "manager" || profile.role === "executive";

  const { data: items } = await supabase
    .from("items_detailed")
    .select("*")
    .eq("module", "supplies")
    .eq("status", "pending_approval")
    .order("requested_at", { ascending: true });

  const requests = (items ?? []).sort((a, b) => {
    const urgentDiff = (b.urgency === "urgent" ? 1 : 0) - (a.urgency === "urgent" ? 1 : 0);
    if (urgentDiff !== 0) return urgentDiff;
    return (a.requested_at ?? "").localeCompare(b.requested_at ?? "");
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-text">Supply requests</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            PPE, site consumables, office and plotter supplies — anything the team needs. Every
            request goes to Manpreet for approval; approved requests move to the Order List.
          </p>
        </div>
        <AddSupplyModal role={profile.role} />
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          <p className="mb-1 text-[15px] font-medium text-text">No open requests</p>
          <p>Click &ldquo;+ New request&rdquo; to ask for a supply item.</p>
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
                  Est. total
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Requested by
                </th>
                <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => {
                const total =
                  item.unit_price === null ? null : (item.qty ?? 0) * item.unit_price;
                const requesterName = item.requested_by_name ?? "Unknown";
                const canWithdraw = canManage || item.requested_by === profile.id;

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
                        {item.vendor}
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
                      {item.note && (
                        <div className="mt-1 text-xs italic text-text-muted">{item.note}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right tabular-nums">{item.qty}</td>
                    <td className="px-3.5 py-3 text-right font-semibold tabular-nums">
                      {total === null ? (
                        <span className="text-xs font-normal text-text-subtle">—</span>
                      ) : (
                        formatCurrency(total)
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-[12.5px] text-text">{requesterName}</td>
                    <td className="px-3.5 py-3 text-right">
                      {canWithdraw ? (
                        <WithdrawButton itemId={item.id!} itemName={item.name ?? "this item"} />
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
