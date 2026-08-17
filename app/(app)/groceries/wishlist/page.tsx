import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getBudgetSnapshot } from "@/lib/budget";
import { formatCurrency, initials } from "@/lib/format";
import { AddWishModal } from "./add-wish-modal";
import { DeleteWishButton } from "./delete-wish-button";
import { PromoteModal } from "./promote-modal";

export default async function WishlistPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();

  const [{ data: items }, { budget, spent }] = await Promise.all([
    supabase
      .from("items_detailed")
      .select("*")
      .eq("status", "wishlist")
      .order("requested_at", { ascending: false }),
    getBudgetSnapshot(),
  ]);

  const wishlist = items ?? [];
  const cap = budget / 3;
  const usedByMe = wishlist
    .filter((item) => item.requested_by === profile.id)
    .reduce((sum, item) => sum + (item.qty ?? 0) * (item.unit_price ?? 0), 0);

  const canManage = profile.role === "manager" || profile.role === "executive";

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-text">Wishlist — this month</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {canManage
              ? "Snack items the team would like ordered. Move an item onto the order list to buy it."
              : "Snack items you and the team would like ordered. A manager moves items from here onto the order list."}
          </p>
        </div>
        <AddWishModal role={profile.role} capAmount={cap} usedAmount={usedByMe} />
      </div>

      {wishlist.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          <p className="mb-1 text-[15px] font-medium text-text">Nothing on the wishlist yet</p>
          <p>Click &ldquo;+ Add wish&rdquo; to request a snack for the month.</p>
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
                  Unit
                </th>
                <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Total
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Added by
                </th>
                <th className="px-3.5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {wishlist.map((item) => {
                const total = (item.qty ?? 0) * (item.unit_price ?? 0);
                const canDelete = canManage || item.requested_by === profile.id;
                const requesterName = item.requested_by_name ?? "Unknown";

                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-[#fafbfc]">
                    <td className="px-3.5 py-3">
                      <div className="font-medium text-text">{item.name}</div>
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
                    </td>
                    <td className="px-3.5 py-3 text-right tabular-nums">{item.qty}</td>
                    <td className="px-3.5 py-3 text-right tabular-nums">
                      {formatCurrency(item.unit_price ?? 0)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                        {initials(requesterName)}
                      </span>
                      <span className="text-[12.5px] text-text">{requesterName}</span>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManage && (
                          <PromoteModal
                            itemId={item.id!}
                            itemName={item.name ?? "this item"}
                            itemTotal={total}
                            budget={budget}
                            spentThisMonth={spent}
                          />
                        )}
                        {canDelete ? (
                          <DeleteWishButton itemId={item.id!} itemName={item.name ?? "this item"} />
                        ) : (
                          !canManage && <span className="text-xs text-text-subtle">—</span>
                        )}
                      </div>
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
