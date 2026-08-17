import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getBudgetSnapshot } from "@/lib/budget";
import { formatCurrency } from "@/lib/format";
import { ApprovalActions } from "@/components/approvals/approval-actions";

export default async function GroceriesApprovalsPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.role !== "executive") {
    redirect("/groceries/wishlist");
  }

  const supabase = await createClient();

  const [{ data: items }, { budget, spent }] = await Promise.all([
    supabase
      .from("items_detailed")
      .select("*")
      .eq("module", "groceries")
      .eq("status", "pending_approval")
      .order("promoted_at", { ascending: true }),
    getBudgetSnapshot(),
  ]);

  const pending = items ?? [];

  return (
    <section>
      <div className="mb-4">
        <h1 className="text-base font-semibold text-text">Pending your approval</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          These over-budget items need your decision before they can be ordered.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          <p className="mb-1 text-[15px] font-medium text-text">No pending approvals</p>
          <p>Over-budget items promoted from the wishlist will show up here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((item) => {
            const total = (item.qty ?? 0) * (item.unit_price ?? 0);
            const overBy = Math.max(0, spent + total - budget);

            return (
              <div
                key={item.id}
                className="rounded-lg border border-l-[3px] border-border border-l-warning bg-surface p-5 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-[15px] font-semibold text-text">{item.name}</div>
                    <div className="text-xs text-text-muted">
                      Wished by {item.requested_by_name ?? "Unknown"} · {item.vendor}
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
                    <div className="text-[11px] uppercase tracking-wide text-text-muted">Unit price</div>
                    <div className="mt-0.5 text-sm font-medium text-text">
                      {formatCurrency(item.unit_price ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-muted">Total</div>
                    <div className="mt-0.5 text-sm font-medium text-text">{formatCurrency(total)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-muted">
                      Would push over by
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-danger">
                      {formatCurrency(overBy)}
                    </div>
                  </div>
                </div>

                {item.over_budget_reason && (
                  <div className="mb-3.5 rounded-md border border-[#fedd8a] bg-warning-soft px-3 py-2.5 text-[13px] text-[#7a4d00]">
                    <div className="mb-0.5 font-semibold text-warning">Reason</div>
                    <div>{item.over_budget_reason}</div>
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
