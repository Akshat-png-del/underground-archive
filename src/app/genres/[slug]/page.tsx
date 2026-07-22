import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { genreLabels, genreDescriptions, getArtistsByGenre } from "@/content/artists";
import { getGenreGuide, getGenreEssentialArtists, getGenreEssentialSets } from "@/content/genres";
import { toSentenceList } from "@/content/hubs";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  collectionPageSchema,
  faqPageSchema,
} from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { GenrePageContent } from "@/components/genres/GenrePageContent";
import type { FaqItem } from "@/components/seo/FaqSection";

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
    title: `${name} — Artists & Sets`,
    description: guide?.seoIntro ?? `Discover ${name} artists and verified sets in the archive.`,
    path: `/genres/${slug}`,
    keywords: [
      name,
      `what is ${name}`,
      `${name} artists`,
      `${name} sets`,
      `best ${name}`,
    ],
  });
}

function buildGenreFaqs(slug: string, name: string): FaqItem[] {
  const guide = getGenreGuide(slug);
  const topArtists = getGenreEssentialArtists(slug, 5).map((a) => a.name);
  const faqs: FaqItem[] = [
    {
      question: `What is ${name}?`,
      answer: guide?.seoIntro ?? genreDescriptions[slug] ?? `${name} is an underground electronic music genre.`,
    },
  ];
  if (guide) {
    faqs.push({
      question: `What BPM is ${name}?`,
      answer: `${name} typically runs at ${guide.sound.bpmRange[0]}–${guide.sound.bpmRange[1]} BPM. ${guide.sound.atmosphere}.`,
    });
    faqs.push({
      question: `Where did ${name} originate?`,
      answer: `${name} emerged in ${guide.origins.city} (${guide.origins.country}) during the ${guide.origins.decade}. ${guide.origins.context}`,
    });
  }
  if (topArtists.length) {
    faqs.push({
      question: `Who are the best ${name} artists?`,
      answer: `Essential ${name} artists in the archive include ${toSentenceList(topArtists)}.`,
    });
  }
  return faqs;
}

export default async function GenrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = genreLabels[slug];
  if (!name) notFound();

  const path = `/genres/${slug}`;
  const artistCount = getArtistsByGenre(slug).length;
  const setCount = getGenreEssentialSets(slug, 999).length;
  const faqs = buildGenreFaqs(slug, name);

  const breadcrumb = [
    { name: "Genres", path: "/genres" },
    { name, path },
  ];

  return (
    <div className="mx-auto max-w-6xl min-w-0 px-4 py-12 sm:py-16">
      <JsonLd
        data={[
          breadcrumbSchema(breadcrumb),
          collectionPageSchema({
            name: `${name} — Artists & Sets`,
            description: getGenreGuide(slug)?.seoIntro ?? genreDescriptions[slug] ?? name,
            path,
            items: getGenreEssentialArtists(slug, 12).map((a) => ({
              name: a.name,
              path: `/artists/${a.slug}`,
            })),
          }),
          faqPageSchema(faqs),
        ]}
      />
      <Breadcrumbs items={breadcrumb} />
      <GenrePageContent slug={slug} artistHubCount={artistCount} setCount={setCount} faqs={faqs} />
    </div>
  );
}
