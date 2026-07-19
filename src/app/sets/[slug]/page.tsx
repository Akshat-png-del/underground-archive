import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { archiveSets, getSet, setCategoryLabels } from "@/content/sets";
import { genreLabels } from "@/content/artists";
import { SetWatchPage } from "@/components/sets/SetWatchPage";
import { RecordView } from "@/components/library/RecordView";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, videoObjectSchema } from "@/lib/seo/jsonld";
import { formatDisplayDate } from "@/lib/format";

export function generateStaticParams() {
  return archiveSets.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const set = getSet(slug);
  if (!set) return {};
  const genre = set.genres[0] ? genreLabels[set.genres[0]] : "techno";
  const durationPart = set.duration ? ` · ${set.duration}` : "";
  return buildMetadata({
    title: `${set.artistName} — ${set.title}`,
    description: `Watch ${set.artistName}'s ${genre} set at ${set.event} (${set.location})${durationPart}. Verified long-form performance in the underground archive.`,
    path: `/sets/${slug}`,
    ogImage: set.thumbnail,
    type: "article",
    keywords: [
      `${set.artistName} ${set.event}`,
      `${set.artistName} set`,
      `${setCategoryLabels[set.category]} sets`,
      genre,
    ],
  });
}

export default async function SetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const set = getSet(slug);
  if (!set) notFound();

  const genre = set.genres[0] ? genreLabels[set.genres[0]] : "techno";

  return (
    <div className="mx-auto w-full max-w-[80rem] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <JsonLd
        data={[
          videoObjectSchema({
            name: `${set.artistName} — ${set.title}`,
            description: `${set.artistName} ${genre} set at ${set.event}, ${set.location}.`,
            path: `/sets/${slug}`,
            youtubeId: set.youtubeId,
            thumbnailUrl: set.thumbnail,
            duration: set.duration,
          }),
          breadcrumbSchema([
            { name: "Sets", path: "/sets" },
            { name: `${set.artistName} — ${set.title}`, path: `/sets/${slug}` },
          ]),
        ]}
      />
      <RecordView type="set" refId={set.id} />
      <SetWatchPage set={set} displayDate={formatDisplayDate(set.date)} />
    </div>
  );
}
