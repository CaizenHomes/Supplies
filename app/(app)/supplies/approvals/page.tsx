import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { ApprovalActions } from "@/components/approvals/approval-actions";

export default async function SuppliesApprovalsPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.role !== "executive") {
    redirect("/supplies/requests");
  }

  const supabase = await createClient();

  const { data: items } = await supabase
    .from("items_detailed")
    .select("*")
    .eq("module", "supplies")
    .eq("status", "pending_approval")
    .order("requested_at", { ascending: true });

  // Urgent requests first, then normal, oldest first within each group.
  const pending = (items ?? []).sort((a, b) => {
    const urgentDiff = (b.urgency === "urgent" ? 1 : 0) - (a.urgency === "urgent" ? 1 : 0);
    if (urgentDiff !== 0) return urgentDiff;
    return (a.requested_at ?? "").localeCompare(b.requested_at ?? "");
  });

  return (
    <section>
      <div className="mb-4">
        <h1 className="text-base font-semibold text-text">Pending your approval</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Every supply request needs your decision before it can be ordered. Urgent requests are
          listed first.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          <p className="mb-1 text-[15px] font-medium text-text">No pending approvals</p>
          <p>New supply requests will show up here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((item) => {
            const total = item.unit_price === null ? null : (item.qty ?? 0) * item.unit_price;
            const isUrgent = item.urgency === "urgent";

            return (
              <div
                key={item.id}
                className={`rounded-lg border border-l-[3px] bg-surface p-5 shadow-sm ${
                  isUrgent ? "border-border border-l-danger" : "border-border border-l-warning"
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-[15px] font-semibold text-text">
                      {item.name}
                      {isUrgent && (
                        <span className="ml-1.5 inline-block rounded-full bg-danger-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-danger">
                          Urgent
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted">
                      Requested by {item.requested_by_name ?? "Unknown"} · {item.vendor}
                    </div>
                  </div>
                  <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                    Pending approval
                  </span>
                </div>

                <div className="mb-3.5 grid grid-cols-4 gap-4 rounded-md bg-bg p-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-muted">Quantity</div>
                    <div className="mt-0.5 text-sm font-medium text-text">{item.qty}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-muted">
                      Est. unit price
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-text">
                      {item.unit_price === null ? "—" : formatCurrency(item.unit_price)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-muted">
                      Est. total
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-text">
                      {total === null ? "—" : formatCurrency(total)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-muted">Urgency</div>
                    <div
                      className={`mt-0.5 text-sm font-medium ${isUrgent ? "text-danger" : "text-text"}`}
                    >
                      {isUrgent ? "Urgent" : "Normal"}
                    </div>
                  </div>
                </div>

                {item.note && (
                  <div className="mb-3.5 rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text">
                    <div className="mb-0.5 font-semibold text-text-muted">What it&rsquo;s for</div>
                    <div>{item.note}</div>
                  </div>
                )}

                <div className="flex justify-end">
                  <ApprovalActions itemId={item.id!} itemName={item.name ?? "this item"} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
