import Link from "next/link";
import { siteConfig, navLinks } from "@/config/site";
import { formatCurrentYear } from "@/lib/format";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="font-serif text-lg text-foreground hover:text-accent">
              {siteConfig.name}
            </Link>
            <p className="mt-2 max-w-xs text-sm text-muted">{siteConfig.tagline}</p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-light">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-accent transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-12 text-xs text-muted" suppressHydrationWarning>
          © {formatCurrentYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
