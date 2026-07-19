import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SetCategory } from "@/types/library";
import {
  archiveSets,
  getSetsByCategory,
  getVisibleSetCollections,
  setCategoryLabels,
  setCollectionDescriptions,
} from "@/content/sets";
import { toSentenceList } from "@/content/hubs";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  collectionPageSchema,
  faqPageSchema,
  videoObjectSchema,
} from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { FaqSection, type FaqItem } from "@/components/seo/FaqSection";
import { SetsDirectoryGrid } from "@/components/sets/SetsDirectoryGrid";

export function generateStaticParams() {
  return getVisibleSetCollections(archiveSets).map((category) => ({ category }));
}

function resolve(category: string) {
  const label = setCategoryLabels[category as SetCategory];
  if (!label) return null;
  const sets = getSetsByCategory(category as SetCategory);
  if (sets.length === 0) return null;
  return { label, sets };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const data = resolve(category);
  if (!data) return {};
  const { label, sets } = data;
  const artists = toSentenceList(
    [...new Set(sets.map((s) => s.artistName))].slice(0, 5),
  );
  return buildMetadata({
    title: `Best ${label} Sets`,
    description: `${sets.length} verified ${label} sets in the underground archive — long-form performances from ${artists}. Every set is API-verified and at least 10 minutes.`,
    path: `/sets/collections/${category}`,
    ogImage: sets[0]?.thumbnail,
    keywords: [
      `best ${label} sets`,
      `${label} archive`,
      `${label} performances`,
      `${label} techno sets`,
    ],
  });
}

export default async function SetCollectionHub({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const data = resolve(category);
  if (!data) notFound();
  const { label, sets } = data;

  const path = `/sets/collections/${category}`;
  const artistNames = [...new Set(sets.map((s) => s.artistName))];
  const otherCollections = getVisibleSetCollections(archiveSets).filter(
    (c) => c !== category,
  );

  const breadcrumb = [
    { name: "Sets", path: "/sets" },
    { name: label, path },
  ];

  const faqs: FaqItem[] = [
    {
      question: `How many ${label} sets are in the archive?`,
      answer: `The archive holds ${sets.length} verified ${label} set${
        sets.length === 1 ? "" : "s"
      }, each an API-verified long-form performance of at least 10 minutes.`,
    },
    {
      question: `Which artists have ${label} sets in the archive?`,
      answer: `${label} performances in the archive feature ${toSentenceList(
        artistNames.slice(0, 8),
      )}${artistNames.length > 8 ? ", and more" : ""}.`,
    },
  ];

  // VideoObject only for sets with an API-verified duration.
  const videoSchemas = sets
    .filter((s) => s.duration)
    .slice(0, 12)
    .map((s) =>
      videoObjectSchema({
        name: `${s.artistName} — ${s.title}`,
        description: `${s.event} · ${s.location}`,
        path: `/sets/${s.slug}`,
        youtubeId: s.youtubeId,
        thumbnailUrl: s.thumbnail,
        duration: s.duration,
      }),
    );

  return (
    <div className="mx-auto max-w-6xl min-w-0 px-4 py-12 sm:py-16">
      <JsonLd
        data={[
          breadcrumbSchema(breadcrumb),
          collectionPageSchema({
            name: `Best ${label} Sets`,
            description: `Verified ${label} performances in the underground archive.`,
            path,
            items: sets.map((s) => ({
              name: `${s.artistName} — ${s.title}`,
              path: `/sets/${s.slug}`,
            })),
          }),
          ...videoSchemas,
          faqPageSchema(faqs),
        ]}
      />
      <Breadcrumbs items={breadcrumb} />

      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">{label}</h1>
      <p className="mt-3 max-w-2xl text-muted-light">
        {setCollectionDescriptions[category as SetCategory]}
      </p>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.15em] text-muted">
        {sets.length} set{sets.length === 1 ? "" : "s"}
      </p>

      <div className="mt-10">
        <SetsDirectoryGrid sets={sets} />
      </div>

      <FaqSection items={faqs} title={`${label} sets — FAQ`} />

      {otherCollections.length > 0 && (
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-serif text-2xl text-foreground">More set collections</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {otherCollections.map((c) => (
              <Link
                key={c}
                href={`/sets/collections/${c}`}
                className="chip-selectable border border-border px-4 py-2 text-sm text-muted-light"
              >
                {setCategoryLabels[c]} →
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 border-t border-border pt-8 text-sm text-muted">
        Browse the{" "}
        <Link href="/sets" className="text-accent hover:underline">
          full set archive
        </Link>{" "}
        ·{" "}
        <Link href="/artists" className="text-accent hover:underline">
          all artists
        </Link>{" "}
        ·{" "}
        <Link href="/genres" className="text-accent hover:underline">
          genres
        </Link>
      </p>
    </div>
  );
}
