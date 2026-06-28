"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/library", label: "Profile" },
  { href: "/library/playlists", label: "My Playlists" },
  { href: "/library/artists", label: "Saved Artists" },
  { href: "/library/sets", label: "Saved Sets" },
  { href: "/library/tracks", label: "Liked Tracks" },
  { href: "/library/history", label: "History" },
];

export function LibraryNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4 sm:flex-col sm:border-b-0 sm:border-r sm:pr-6 sm:pb-0">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "px-3 py-2 text-sm transition-colors",
            pathname === link.href
              ? "bg-surface text-accent border border-border"
              : "text-muted-light hover:text-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
