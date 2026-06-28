import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { genreLabels } from "@/content/artists";
import { getGenreGuide } from "@/content/genres";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenrePageContent } from "@/components/genres/GenrePageContent";

export function generateStaticParams() {
  return Object.keys(genreLabels).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = genreLabels[slug];
  if (!name) return {};
  const guide = getGenreGuide(slug);
  return buildMetadata({
    title: name,
    description: guide?.seoIntro ?? `Discover ${name} artists, sets, and archive guides.`,
    path: `/genres/${slug}`,
  });
}

export default async function GenrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!genreLabels[slug]) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <GenrePageContent slug={slug} />
    </div>
  );
}
