"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/library", label: "Overview" },
  { href: "/library/playlists", label: "My Playlists" },
  { href: "/library/artists", label: "Saved Artists" },
  { href: "/library/sets", label: "Saved Sets" },
  { href: "/library/history", label: "History" },
];

export function LibraryNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border/70 pb-3 lg:w-44 lg:shrink-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0 lg:pr-6"
      aria-label="Library"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-sm px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
            pathname === link.href
              ? "bg-surface-elevated font-medium text-foreground"
              : "text-muted-light hover:bg-surface/60 hover:text-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
