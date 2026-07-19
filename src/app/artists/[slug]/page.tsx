import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { artists, getArtist, genreLabels } from "@/content/artists";
import { buildMetadata } from "@/lib/seo/metadata";
import { musicianSchema, breadcrumbSchema, faqPageSchema } from "@/lib/seo/jsonld";
import { artistSameAs, buildArtistFaqs } from "@/lib/seo/artist-seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArtistPageContent } from "@/components/artists/ArtistPageContent";
import { ArtistSeoSection } from "@/components/seo/ArtistSeoSection";
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
    ogImage: artist.portrait || artist.image?.url,
    type: "profile",
    keywords: [
      artist.name,
      `${artist.name} sets`,
      `${artist.name} tracks`,
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
  const faqs = buildArtistFaqs(artist);
  const verifiedTracks = artist.topTracks
    .filter((t) => t.spotifyUrl || t.youtubeUrl)
    .slice(0, 10)
    .map((t) => ({ name: t.title, url: t.spotifyUrl ?? t.youtubeUrl, duration: t.duration }));

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
            sameAs: artistSameAs(artist),
            tracks: verifiedTracks,
          }),
          breadcrumbSchema([
            { name: "Artists", path: "/artists" },
            { name: artist.name, path: `/artists/${slug}` },
          ]),
          faqPageSchema(faqs),
        ]}
      />
      <RecordView type="artist" refId={slug} />
      <ArtistPageContent artist={artist} />
      <ArtistSeoSection artist={artist} faqs={faqs} />
    </>
  );
}
