"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { Menu, X } from "lucide-react";
import { siteConfig, navLinks } from "@/config/site";
import { SearchBar } from "@/components/search/SearchBar";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 font-serif text-lg text-foreground hover:text-accent">
          {siteConfig.shortName}
        </Link>

        <div className="hidden flex-1 md:block md:max-w-xs lg:max-w-sm">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>

        <nav className="hidden items-center gap-6 lg:flex lg:gap-8" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-light hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/library" className="text-sm text-muted-light hover:text-foreground transition-colors">
            Library
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/library"
            className="text-sm text-muted-light hover:text-accent lg:hidden"
          >
            Library
          </Link>
          <button
            type="button"
            className="interactive-ghost p-2 text-foreground hover:text-accent lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-surface px-4 py-4 lg:hidden" aria-label="Mobile">
          <Suspense fallback={null}>
            <SearchBar className="mb-4" />
          </Suspense>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-3 text-sm text-muted-light hover:text-accent"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/library"
            className="block py-3 text-sm text-muted-light hover:text-accent"
            onClick={() => setOpen(false)}
          >
            Library
          </Link>
        </nav>
      )}
    </header>
  );
}
