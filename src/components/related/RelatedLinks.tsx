import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface RelatedLink {
  href: string;
  title: string;
  description?: string;
}

interface RelatedLinksProps {
  title: string;
  links: RelatedLink[];
}

export function RelatedLinks({ title, links }: RelatedLinksProps) {
  if (links.length === 0) return null;

  return (
    <section className="mt-12" aria-labelledby="related-heading">
      <h2 id="related-heading" className="font-serif text-2xl font-semibold text-foreground">
        {title}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start justify-between gap-3 rounded-xl border border-card-border bg-card p-4 transition-colors hover:border-accent/30 hover:bg-accent-subtle/30"
          >
            <div>
              <p className="font-medium text-foreground group-hover:text-accent">
                {link.title}
              </p>
              {link.description && (
                <p className="mt-1 text-sm text-muted line-clamp-2">{link.description}</p>
              )}
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted group-hover:text-accent transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  );
}
