import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getReceiptSignedUrl } from "@/lib/receipts";
import { OrderTable } from "@/components/orders/order-table";

const ORDER_STATUSES = ["in_list", "ordered"] as const;

const STATUS_ORDER: Record<string, number> = {
  in_list: 0,
  ordered: 1,
};

export default async function GroceriesOrdersPage() {
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
      .eq("module", "groceries")
      .in("status", ORDER_STATUSES),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  const sorted = (items ?? []).sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status ?? ""] ?? 99) - (STATUS_ORDER[b.status ?? ""] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return (b.promoted_at ?? "").localeCompare(a.promoted_at ?? "");
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
        <h1 className="text-base font-semibold text-text">Order list — this month</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Items approved to buy, ordered but not yet received, or awaiting verification.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center text-text-muted">
          <p className="mb-1 text-[15px] font-medium text-text">Nothing on the order list yet</p>
          <p>Move an item from the wishlist to start ordering it.</p>
        </div>
      ) : (
        <OrderTable
          module="groceries"
          orders={orders}
          canManage={canManage}
          currentUserId={profile.id}
          activeProfiles={activeProfiles ?? []}
        />
      )}
    </section>
  );
}
