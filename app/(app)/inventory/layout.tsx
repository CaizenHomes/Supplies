import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/profile";
import { SubTabs, type SubTabLink } from "@/components/sub-tabs";

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.role !== "executive" && profile.role !== "manager") {
    redirect("/groceries/wishlist");
  }

  const links: SubTabLink[] = [
    { href: "/inventory", label: "Summary", exact: true },
    { href: "/inventory/products", label: "Products" },
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
