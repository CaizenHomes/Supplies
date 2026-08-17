import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/profile";
import { getBudgetSnapshot } from "@/lib/budget";
import { getPendingApprovalCount } from "@/lib/pending-approvals";
import { BudgetBar } from "@/components/budget-bar";
import { SubTabs, type SubTabLink } from "@/components/sub-tabs";

export default async function GroceriesLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const isExecutive = profile.role === "executive";
  const [{ budget, spent }, pendingApprovals] = await Promise.all([
    getBudgetSnapshot(),
    isExecutive ? getPendingApprovalCount("groceries") : Promise.resolve(0),
  ]);

  const links: SubTabLink[] = [
    { href: "/groceries/wishlist", label: "Wishlist" },
    { href: "/groceries/orders", label: "Order List" },
    {
      href: "/groceries/approvals",
      label: "Approvals",
      hidden: !isExecutive,
      badge: pendingApprovals,
    },
    { href: "/groceries/history", label: "History" },
  ];

  return (
    <>
      <div className="-mx-8 -mt-6 mb-6 border-b border-border bg-surface">
        <BudgetBar budget={budget} spent={spent} />
        <SubTabs links={links} />
      </div>
      {children}
    </>
  );
}
