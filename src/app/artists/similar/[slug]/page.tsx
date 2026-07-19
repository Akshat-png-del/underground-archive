import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtist, genreLabels } from "@/content/artists";
import { getSimilarArtists, getSimilarHubSlugs, toSentenceList } from "@/content/hubs";
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
  return getSimilarHubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = getArtist(slug);
  const similar = getSimilarArtists(slug);
  if (!artist || similar.length < 2) return {};
  const names = toSentenceList(similar.slice(0, 5).map((a) => a.name));
  const genres = artist.genres.map((g) => genreLabels[g] || g).join(", ");
  return buildMetadata({
    title: `Artists like ${artist.name}`,
    description: `If you like ${artist.name} (${genres}), explore ${similar.length} similar underground artists — ${names}. Verified profiles, sets, and tracks.`,
    path: `/artists/similar/${slug}`,
    keywords: [
      `artists like ${artist.name}`,
      `similar to ${artist.name}`,
      `${artist.name} recommendations`,
      ...artist.genres.map((g) => genreLabels[g] || g),
    ],
  });
}

export default async function SimilarArtistsHub({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = getArtist(slug);
  if (!artist) notFound();
  const similar = getSimilarArtists(slug);
  if (similar.length < 2) notFound();

  const path = `/artists/similar/${slug}`;
  const genreNames = artist.genres.map((g) => genreLabels[g] || g);

  const breadcrumb = [
    { name: "Artists", path: "/artists" },
    { name: artist.name, path: `/artists/${slug}` },
    { name: "Similar artists", path },
  ];

  const faqs: FaqItem[] = [
    {
      question: `Who sounds like ${artist.name}?`,
      answer: `Listeners into ${artist.name} tend to explore ${toSentenceList(
        similar.slice(0, 6).map((a) => a.name),
      )} — artists sharing ${toSentenceList(genreNames)} sensibilities in the archive.`,
    },
    {
      question: `What genre is ${artist.name}?`,
      answer: `${artist.name} is associated with ${toSentenceList(genreNames)}, based in ${artist.city}, ${artist.country}.`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl min-w-0 px-4 py-12 sm:py-16">
      <JsonLd
        data={[
          breadcrumbSchema(breadcrumb),
          collectionPageSchema({
            name: `Artists like ${artist.name}`,
            description: `Underground artists similar to ${artist.name}.`,
            path,
            items: similar.map((a) => ({ name: a.name, path: `/artists/${a.slug}` })),
          }),
          faqPageSchema(faqs),
        ]}
      />
      <Breadcrumbs items={breadcrumb} />

      <p className="text-sm text-accent">Discovery</p>
      <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
        Artists like {artist.name}
      </h1>
      <p className="mt-3 max-w-3xl text-muted-light">
        {similar.length} underground artists sharing {toSentenceList(genreNames)} territory with{" "}
        <Link href={`/artists/${slug}`} className="text-accent hover:underline">
          {artist.name}
        </Link>
        . Every recommendation is a verified profile in the archive.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        {artist.genres.map((g) => (
          <Link
            key={g}
            href={`/artists/genre/${g}`}
            className="chip-selectable border border-border px-4 py-2 text-muted-light"
          >
            {genreLabels[g]} artists →
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <ArtistGrid artists={similar} />
      </div>

      <FaqSection items={faqs} title={`Artists like ${artist.name} — FAQ`} />

      <p className="mt-12 border-t border-border pt-8 text-sm text-muted">
        Back to{" "}
        <Link href={`/artists/${slug}`} className="text-accent hover:underline">
          {artist.name}
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
