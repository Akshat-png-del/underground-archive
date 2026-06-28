import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { artists, getArtist, genreLabels } from "@/content/artists";
import { buildMetadata } from "@/lib/seo/metadata";
import { musicianSchema, breadcrumbSchema } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArtistPageContent } from "@/components/artists/ArtistPageContent";
import { RecordView } from "@/components/library/RecordView";

export function generateStaticParams() {
  return artists.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = getArtist(slug);
  if (!artist) return {};

  const bioPreview = [
    artist.editorialBio.origins,
    artist.editorialBio.presentDay,
  ].join(" ");

  return buildMetadata({
    title: `${artist.name} — Artist Profile`,
    description: bioPreview.slice(0, 160),
    path: `/artists/${slug}`,
    keywords: [
      ...artist.genres.map((g) => genreLabels[g] || g),
      ...artist.moodTags,
      artist.scene,
      ...artist.labels,
    ],
  });
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = getArtist(slug);
  if (!artist) notFound();

  const bioDescription = Object.values(artist.editorialBio).join(" ");

  return (
    <>
      <JsonLd
        data={[
          musicianSchema({
            name: artist.name,
            description: bioDescription.slice(0, 300),
            path: `/artists/${slug}`,
            image: artist.portrait,
            genres: artist.genres.map((g) => genreLabels[g] || g),
            origin: `${artist.city}, ${artist.country}`,
          }),
          breadcrumbSchema([
            { name: "Artists", path: "/artists" },
            { name: artist.name, path: `/artists/${slug}` },
          ]),
        ]}
      />
      <RecordView type="artist" refId={slug} />
      <ArtistPageContent artist={artist} />
    </>
  );
}
