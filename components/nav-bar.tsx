"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Enums } from "@/lib/types";

type NavLink = {
  href: string;
  label: string;
  roles?: Array<Enums<"user_role">>;
};

const LINKS: NavLink[] = [
  { href: "/wishlist", label: "Wishlist" },
  { href: "/orders", label: "Orders" },
  { href: "/approvals", label: "Approvals", roles: ["executive"] },
  { href: "/history", label: "History" },
  { href: "/admin", label: "Admin", roles: ["executive"] },
];

export function NavBar({ role }: { role: Enums<"user_role"> }) {
  const pathname = usePathname();
  const links = LINKS.filter((link) => !link.roles || link.roles.includes(role));

  return (
    <nav className="flex gap-1 border-t border-border px-8">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium ${
              active
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
