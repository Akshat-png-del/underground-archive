import type { Metadata } from "next";
import Link from "next/link";
import { genreLabels, genreDescriptions } from "@/content/artists";
import { getGenreHubSlugs, getComparisonGuides } from "@/content/hubs";
import { articles, categoryLabels } from "@/content/editorial";
import type { EditorialArticle } from "@/types";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  collectionPageSchema,
} from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const metadata: Metadata = buildMetadata({
  title: "Guides",
  description:
    "Guides to underground electronic music — what is hard techno, schranz, industrial techno, EBM and darkwave, genre comparisons, histories, and listening paths.",
  path: "/guides",
});

const GUIDE_CATEGORIES: EditorialArticle["category"][] = [
  "genre-guides",
  "beginner-guides",
  "listening-guides",
  "scene-histories",
  "club-histories",
  "label-histories",
];

export default function GuidesIndex() {
  const genres = getGenreHubSlugs();
  const comparisons = getComparisonGuides();
  const guideArticles = articles.filter((a) => GUIDE_CATEGORIES.includes(a.category));

  const breadcrumb = [{ name: "Guides", path: "/guides" }];

  return (
    <div className="mx-auto max-w-6xl min-w-0 px-4 py-12 sm:py-16">
      <JsonLd
        data={[
          breadcrumbSchema(breadcrumb),
          collectionPageSchema({
            name: "Guides",
            description:
              "Genre guides, comparisons, and histories for underground electronic music.",
            path: "/guides",
            items: [
              ...genres.map((g) => ({ name: `What is ${genreLabels[g]}?`, path: `/genres/${g}` })),
              ...comparisons.map((c) => ({
                name: `${genreLabels[c.a]} vs ${genreLabels[c.b]}`,
                path: `/guides/${c.slug}`,
              })),
            ],
          }),
        ]}
      />
      <Breadcrumbs items={breadcrumb} />

      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Guides</h1>
      <p className="mt-3 max-w-2xl text-muted-light">
        Understand the sounds, scenes, and history of underground electronic music. Every guide is
        built from the archive&apos;s verified catalog.
      </p>

      <section className="mt-12">
        <h2 className="font-serif text-2xl text-foreground">What is…? Genre guides</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {genres.map((g) => (
            <Link
              key={g}
              href={`/genres/${g}`}
              className="interactive-row group block border border-border p-5"
            >
              <p className="font-serif text-lg text-foreground group-hover:text-accent">
                What is {genreLabels[g]}?
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-muted-light">{genreDescriptions[g]}</p>
            </Link>
          ))}
        </div>
      </section>

      {comparisons.length > 0 && (
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-serif text-2xl text-foreground">Genre comparisons</h2>
          <p className="mt-2 text-sm text-muted">
            Side-by-side breakdowns for the questions listeners actually search for.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comparisons.map((c) => (
              <Link
                key={c.slug}
                href={`/guides/${c.slug}`}
                className="interactive-row group block border border-border p-5"
              >
                <p className="font-serif text-lg text-foreground group-hover:text-accent">
                  {genreLabels[c.a]} vs {genreLabels[c.b]}
                </p>
                <p className="mt-2 text-sm text-muted-light">What&apos;s the difference?</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {guideArticles.length > 0 && (
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-serif text-2xl text-foreground">Histories &amp; deep dives</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {guideArticles.map((a) => (
              <Link
                key={a.slug}
                href={`/editorial/${a.slug}`}
                className="interactive-row group block border border-border p-5"
              >
                <p className="text-xs uppercase tracking-wider text-accent">
                  {categoryLabels[a.category]}
                </p>
                <p className="mt-2 font-serif text-lg text-foreground group-hover:text-accent">
                  {a.title}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-light">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
