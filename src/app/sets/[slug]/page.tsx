import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveSets, getSet, setCategoryLabels } from "@/content/sets";
import { SetDetail } from "@/components/sets/SetDetail";
import { RecordView } from "@/components/library/RecordView";
import { buildMetadata } from "@/lib/seo/metadata";

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
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Link href="/sets" className="text-sm text-accent hover:underline">← All sets</Link>
      <div className="mt-4">
        <p className="text-sm text-accent">{setCategoryLabels[set.category]}</p>
        <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">{set.title}</h1>
        <p className="mt-2 text-muted">
          <Link href={`/artists/${set.artistSlug}`} className="hover:text-accent">{set.artistName}</Link>
          {" · "}{set.event} · {set.location} · {set.duration}
        </p>
      </div>
      <RecordView type="set" refId={set.id} />
      <SetDetail set={set} />
    </div>
  );
}
