import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Genre } from "@/types";
import { genreLabels, genreDescriptions } from "@/content/artists";
import { getGenreGuide, getGenreEssentialSets } from "@/content/genres";
import { getGenreHubSlugs, getGenreHubArtists, toSentenceList } from "@/content/hubs";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  collectionPageSchema,
  faqPageSchema,
} from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { FaqSection, type FaqItem } from "@/components/seo/FaqSection";
import { ArtistGrid } from "@/components/artists/ArtistGrid";

export function generateStaticParams() {
  return getGenreHubSlugs().map((genre) => ({ genre }));
}

function resolve(slug: string) {
  const name = genreLabels[slug];
  if (!name) return null;
  const artists = getGenreHubArtists(slug as Genre);
  if (artists.length === 0) return null;
  return { name, artists, guide: getGenreGuide(slug) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string }>;
}): Promise<Metadata> {
  const { genre } = await params;
  const data = resolve(genre);
  if (!data) return {};
  const { name, artists } = data;
  const topNames = toSentenceList(artists.slice(0, 5).map((a) => a.name));
  return buildMetadata({
    title: `${name} Artists`,
    description: `The essential ${name} artists in the underground archive — ${artists.length} verified profiles including ${topNames}. Sets, tracks, and discovery.`,
    path: `/artists/genre/${genre}`,
    keywords: [
      `${name} artists`,
      `best ${name} artists`,
      `${name} DJs`,
      `${name} producers`,
      "underground techno",
    ],
  });
}

export default async function GenreArtistsHub({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre } = await params;
  const data = resolve(genre);
  if (!data) notFound();
  const { name, artists, guide } = data;

  const path = `/artists/genre/${genre}`;
  const topNames = artists.slice(0, 5).map((a) => a.name);
  const setCount = getGenreEssentialSets(genre, 999).length;

  const breadcrumb = [
    { name: "Artists", path: "/artists" },
    { name: `${name} Artists`, path },
  ];

  const faqs: FaqItem[] = [
    {
      question: `Who are the best ${name} artists?`,
      answer: `The archive features ${artists.length} verified ${name} artists, including ${toSentenceList(
        topNames,
      )}. Each profile links to verified sets, tracks, and similar artists.`,
    },
    ...(guide
      ? [
          {
            question: `What BPM is ${name}?`,
            answer: `${name} typically runs at ${guide.sound.bpmRange[0]}–${guide.sound.bpmRange[1]} BPM. ${guide.sound.atmosphere}.`,
          },
          {
            question: `Where did ${name} originate?`,
            answer: `${name} emerged in ${guide.origins.city} (${guide.origins.country}) during the ${guide.origins.decade}. ${guide.origins.context}`,
          },
        ]
      : []),
    ...(setCount > 0
      ? [
          {
            question: `Where can I watch ${name} sets?`,
            answer: `The archive holds ${setCount} verified ${name} sets — long-form performances from HÖR Berlin, Boiler Room, festivals, and warehouse sessions.`,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl min-w-0 px-4 py-12 sm:py-16">
      <JsonLd
        data={[
          breadcrumbSchema(breadcrumb),
          collectionPageSchema({
            name: `${name} Artists`,
            description: `Verified ${name} artists in the underground archive.`,
            path,
            items: artists.map((a) => ({ name: a.name, path: `/artists/${a.slug}` })),
          }),
          faqPageSchema(faqs),
        ]}
      />
      <Breadcrumbs items={breadcrumb} />

      <p className="text-sm text-accent">Genre · Artists</p>
      <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">{name} Artists</h1>
      <p className="mt-3 max-w-3xl text-muted-light">
        {guide?.seoIntro ?? genreDescriptions[genre]}
      </p>
      <p className="mt-4 text-sm text-muted">
        {artists.length} verified {name} artist{artists.length === 1 ? "" : "s"} in the archive.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href={`/genres/${genre}`} className="chip-selectable border border-border px-4 py-2 text-muted-light">
          Explore {name} →
        </Link>
        {setCount > 0 && (
          <Link
            href={`/genres/${genre}#essential-sets`}
            className="chip-selectable border border-border px-4 py-2 text-muted-light"
          >
            {name} sets →
          </Link>
        )}
      </div>

      <div className="mt-10">
        <ArtistGrid artists={artists} />
      </div>

      {guide && guide.relatedGenres.length > 0 && (
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-serif text-2xl text-foreground">Related genres</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {guide.relatedGenres.map((g) => (
              <Link
                key={g}
                href={`/artists/genre/${g}`}
                className="chip-selectable border border-border px-4 py-2 text-sm text-muted-light"
              >
                {genreLabels[g]} artists →
              </Link>
            ))}
          </div>
        </section>
      )}

      {guide && guide.essentialLabels.length > 0 && (
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-serif text-2xl text-foreground">Defining labels</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {guide.essentialLabels.map((label) => (
              <span key={label} className="border border-border px-3 py-1 text-xs text-muted-light">
                {label}
              </span>
            ))}
          </div>
        </section>
      )}

      <FaqSection items={faqs} title={`${name} artists — FAQ`} />

      <p className="mt-12 border-t border-border pt-8 text-sm text-muted">
        Explore more:{" "}
        <Link href="/genres" className="text-accent hover:underline">
          all genres
        </Link>{" "}
        ·{" "}
        <Link href={`/genres/${genre}#essential-sets`} className="text-accent hover:underline">
          essential sets
        </Link>{" "}
        ·{" "}
        <Link href="/artists" className="text-accent hover:underline">
          all artists
        </Link>
      </p>
    </div>
  );
}
