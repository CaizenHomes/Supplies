import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/profile";
import { getPendingApprovalCount } from "@/lib/pending-approvals";
import { SubTabs, type SubTabLink } from "@/components/sub-tabs";

export default async function SuppliesLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const isExecutive = profile.role === "executive";
  const pendingApprovals = isExecutive ? await getPendingApprovalCount("supplies") : 0;

  const links: SubTabLink[] = [
    { href: "/supplies/requests", label: "Requests" },
    { href: "/supplies/orders", label: "Order List" },
    {
      href: "/supplies/approvals",
      label: "Approvals",
      hidden: !isExecutive,
      badge: pendingApprovals,
    },
    { href: "/supplies/history", label: "History" },
  ];

  return (
    <>
      <div className="-mx-8 -mt-6 mb-6 border-b border-border bg-surface">
        <SubTabs links={links} />
      </div>
      {children}
    </>
  );
}
