import Link from "next/link";
import { siteConfig, navLinks } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <p className="font-serif text-lg text-foreground">{siteConfig.name}</p>
            <p className="mt-2 max-w-sm text-sm text-muted">{siteConfig.tagline}</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-light">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-accent">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-8 text-xs text-muted">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
