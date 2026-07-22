import type { Metadata } from "next";
import Link from "next/link";
import { articles, categoryLabels, archiveCategories, getArticlesByCategory } from "@/content/editorial";
import { glossaryTerms } from "@/content/glossary";
import { buildMetadata } from "@/lib/seo/metadata";
import { SectionLabel } from "@/components/ui/ArchivePrimitives";
import { SafeImage } from "@/components/ui/SafeImage";

export const metadata: Metadata = buildMetadata({
  title: "Cultural Archive",
  description:
    "Scene histories, artist essays, label and club histories, cultural essays, and underground terminology.",
  path: "/editorial",
});

export default function EditorialPage() {
  const featured = articles.filter((a) => a.featured);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionLabel>Archive</SectionLabel>
      <h1 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">Cultural Knowledge</h1>
      <p className="mt-4 max-w-2xl text-muted-light">
        Scene histories, listening paths, label and club context, and underground terminology —
        organized so you can move from a genre page into deeper reading without leaving the archive.
      </p>
      <div className="mt-6 grid gap-4 border border-border/70 bg-surface/30 p-5 sm:grid-cols-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Start here</p>
          <p className="mt-2 text-sm text-muted-light">
            Pick a featured essay, then browse categories for genre history, clubs, and culture.
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Connect to sound</p>
          <p className="mt-2 text-sm text-muted-light">
            Genre pages and artist profiles link back here when related reading exists.
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Terminology</p>
          <p className="mt-2 text-sm text-muted-light">
            Use the glossary below when a scene term needs a precise, archive-backed definition.
          </p>
        </div>
      </div>

      {featured.length > 0 && (
        <div className="mt-12">
          <Link href={`/editorial/${featured[0].slug}`} className="group grid gap-8 lg:grid-cols-2">
            <div className="relative aspect-[16/10] overflow-hidden">
              <SafeImage src={featured[0].heroImage} alt="" fill className="transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 50vw" priority />
            </div>
            <div className="flex flex-col justify-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-accent">{categoryLabels[featured[0].category]}</p>
              <h2 className="mt-3 font-serif text-3xl text-foreground group-hover:text-accent transition-colors lg:text-4xl">{featured[0].title}</h2>
              <p className="mt-4 text-muted-light">{featured[0].excerpt}</p>
            </div>
          </Link>
        </div>
      )}

      <section className="mt-16">
        <h2 className="font-serif text-2xl text-foreground">Browse by category</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {archiveCategories.map((cat) => {
            const catArticles = getArticlesByCategory(cat);
            if (catArticles.length === 0) return null;
            return (
              <div key={cat} className="border border-border p-5">
                <h3 className="font-medium text-foreground">{categoryLabels[cat]}</h3>
                <ul className="mt-3 space-y-2">
                  {catArticles.slice(0, 4).map((a) => (
                    <li key={a.slug}>
                      <Link href={`/editorial/${a.slug}`} className="text-sm text-muted-light hover:text-accent">{a.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-16 border-t border-border pt-16">
        <h2 className="font-serif text-2xl text-foreground">Terminology</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-light">
          Essential underground vocabulary — from schranz and peak time to B2B and warehouse culture.
        </p>
        <dl className="mt-8 grid gap-6 sm:grid-cols-2">
          {glossaryTerms.map((item) => (
            <div key={item.slug} id={item.slug} className="border border-border p-5 scroll-mt-20">
              <dt className="font-serif text-lg text-foreground">{item.term}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-light">{item.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-16 border-t border-border pt-16">
        <h2 className="font-serif text-2xl text-foreground">All articles</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.slug} href={`/editorial/${article.slug}`} className="group">
              <div className="relative aspect-[16/10] overflow-hidden">
                <SafeImage src={article.heroImage} alt="" fill className="transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-accent">{categoryLabels[article.category]}</p>
              <h3 className="mt-2 font-serif text-xl text-foreground group-hover:text-accent transition-colors">{article.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{article.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
