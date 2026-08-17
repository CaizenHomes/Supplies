"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SubTabLink = {
  href: string;
  label: string;
  hidden?: boolean;
  badge?: number;
};

export function SubTabs({ links }: { links: SubTabLink[] }) {
  const pathname = usePathname();
  const visible = links.filter((link) => !link.hidden);

  return (
    <nav className="flex gap-1 border-t border-border px-8">
      {visible.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium ${
              active
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {link.label}
            {!!link.badge && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
                {link.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
