"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ModuleSwitcherProps = {
  groceriesPending: number;
  suppliesPending: number;
};

export function ModuleSwitcher({ groceriesPending, suppliesPending }: ModuleSwitcherProps) {
  const pathname = usePathname();
  const activeModule = pathname.startsWith("/supplies")
    ? "supplies"
    : pathname.startsWith("/groceries")
      ? "groceries"
      : null;

  return (
    <div className="inline-flex gap-1 rounded-[10px] border border-border bg-surface p-1 shadow-sm">
      <ModuleButton
        href="/groceries/wishlist"
        label="Groceries"
        active={activeModule === "groceries"}
        pending={groceriesPending}
      />
      <ModuleButton
        href="/supplies/requests"
        label="Supplies"
        active={activeModule === "supplies"}
        pending={suppliesPending}
      />
    </div>
  );
}

function ModuleButton({
  href,
  label,
  active,
  pending,
}: {
  href: string;
  label: string;
  active: boolean;
  pending: number;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-[7px] px-4.5 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-accent text-white hover:bg-accent-hover"
          : "text-text-muted hover:bg-bg hover:text-text"
      }`}
    >
      {label}
      {pending > 0 && (
        <span
          className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold ${
            active ? "bg-white text-accent" : "bg-danger text-white"
          }`}
        >
          {pending}
        </span>
      )}
    </Link>
  );
}
