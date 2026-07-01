import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { archiveSets, getSet } from "@/content/sets";
import { SetWatchPage } from "@/components/sets/SetWatchPage";
import { RecordView } from "@/components/library/RecordView";
import { buildMetadata } from "@/lib/seo/metadata";
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
  return buildMetadata({
    title: `${set.title} — ${set.artistName}`,
    description: `${set.event} · ${set.location}`,
    path: `/sets/${slug}`,
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

  return (
    <div className="mx-auto w-full max-w-[80rem] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <RecordView type="set" refId={set.id} />
      <SetWatchPage set={set} displayDate={formatDisplayDate(set.date)} />
    </div>
  );
}
