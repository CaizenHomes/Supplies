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
        <div className="flex items-center justify-between gap-3 px-gutter py-3 sm:px-gutter-lg">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
              C
            </div>
            <span className="hidden text-[15px] font-semibold text-text sm:inline">
              CaizenX Supplies
            </span>
          </div>

          {/* Desktop only — same component also renders below, full-width, for mobile
              (see the second row). Splitting it out is what keeps the top row from
              wrapping: without its own row, the switcher plus the right-hand user zone
              don't fit in ~360px for executive/manager accounts (Inventory + Admin +
              Sign out links pile up), so the header used to wrap unpredictably into 2-3
              competing rows. */}
          <div className="hidden sm:block">
            <ModuleSwitcher groceriesPending={groceriesPending} suppliesPending={suppliesPending} />
          </div>

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
                className="flex min-h-touch items-center text-sm font-medium text-text-muted hover:text-text sm:min-h-0"
              >
                Inventory
              </Link>
            )}
            {profile.role === "executive" && (
              <Link
                href="/admin"
                className="flex min-h-touch items-center text-sm font-medium text-text-muted hover:text-text sm:min-h-0"
              >
                Admin
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>

        {/* Mobile only — the module switcher gets the full row width to itself instead of
            competing with the logo and user zone above. */}
        <div className="flex justify-center border-t border-border px-gutter py-2 sm:hidden">
          <ModuleSwitcher groceriesPending={groceriesPending} suppliesPending={suppliesPending} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-gutter py-6 sm:px-gutter-lg">{children}</main>
    </div>
  );
}
