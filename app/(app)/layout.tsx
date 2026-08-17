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
        <div className="flex items-center justify-between gap-4 px-8 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
              C
            </div>
            <span className="text-[15px] font-semibold text-text">CaizenX Supplies</span>
          </div>

          <ModuleSwitcher groceriesPending={groceriesPending} suppliesPending={suppliesPending} />

          <div className="flex items-center gap-4">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${ROLE_BADGE_CLASS[profile.role]}`}
            >
              {ROLE_LABEL[profile.role]}
            </span>
            <span className="text-sm text-text-muted">{profile.full_name}</span>
            {profile.role === "executive" && (
              <Link
                href="/admin"
                className="text-sm font-medium text-text-muted hover:text-text"
              >
                Admin
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
