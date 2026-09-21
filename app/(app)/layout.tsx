import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/profile";
import { getPendingApprovalCount } from "@/lib/pending-approvals";
import { ModuleSwitcher } from "@/components/module-switcher";
import { SignOutButton } from "@/components/sign-out-button";

const ROLE_LABEL: Record<string, string> = {
  executive: "Executive",
  manager: "Manager",
  staff: "Staff",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  executive: "bg-[#fdf2fa] text-[#9e165f]",
  manager: "bg-accent-soft text-accent",
  staff: "bg-info-soft text-info",
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  // Only executives approve, so only they need the badge count query.
  const [groceriesPending, suppliesPending] =
    profile.role === "executive"
      ? await Promise.all([
          getPendingApprovalCount("groceries"),
          getPendingApprovalCount("supplies"),
        ])
      : [0, 0];

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:gap-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
              C
            </div>
            <span className="hidden text-[15px] font-semibold text-text sm:inline">
              CaizenX Supplies
            </span>
          </div>

          <ModuleSwitcher groceriesPending={groceriesPending} suppliesPending={suppliesPending} />

          <div className="flex items-center gap-3 sm:gap-4">
            <span
              title={ROLE_LABEL[profile.role]}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold uppercase sm:h-auto sm:w-auto sm:rounded-full sm:px-2 sm:py-0.5 sm:tracking-wide ${ROLE_BADGE_CLASS[profile.role]}`}
            >
              <span className="sm:hidden">{ROLE_LABEL[profile.role].charAt(0)}</span>
              <span className="hidden sm:inline">{ROLE_LABEL[profile.role]}</span>
            </span>
            <span className="hidden text-sm text-text-muted sm:inline">{profile.full_name}</span>
            {(profile.role === "executive" || profile.role === "manager") && (
              <Link
                href="/inventory"
                className="flex min-h-11 items-center text-sm font-medium text-text-muted hover:text-text sm:min-h-0"
              >
                Inventory
              </Link>
            )}
            {profile.role === "executive" && (
              <Link
                href="/admin"
                className="flex min-h-11 items-center text-sm font-medium text-text-muted hover:text-text sm:min-h-0"
              >
                Admin
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
