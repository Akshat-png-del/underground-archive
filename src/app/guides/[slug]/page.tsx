import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { genreLabels } from "@/content/artists";
import { getGenreGuide, getGenreEssentialArtists } from "@/content/genres";
import { getComparisonGuide, getComparisonGuides, toSentenceList } from "@/content/hubs";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, faqPageSchema } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { FaqSection, type FaqItem } from "@/components/seo/FaqSection";

export function generateStaticParams() {
  return getComparisonGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getComparisonGuide(slug);
  if (!guide) return {};
  const aName = genreLabels[guide.a];
  const bName = genreLabels[guide.b];
  return buildMetadata({
    title: `${aName} vs ${bName}: What's the Difference?`,
    description: `A clear, data-driven comparison of ${aName} and ${bName} — BPM ranges, atmosphere, origins, and defining artists in the underground archive.`,
    path: `/guides/${slug}`,
    type: "article",
    keywords: [
      `${aName} vs ${bName}`,
      `difference between ${aName} and ${bName}`,
      `is ${aName} the same as ${bName}`,
      aName,
      bName,
    ],
  });
}

function StatRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-border py-4 sm:grid-cols-[10rem_1fr_1fr] sm:gap-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="text-sm text-foreground">{a}</p>
      <p className="text-sm text-foreground">{b}</p>
    </div>
  );
}

export default async function ComparisonGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getComparisonGuide(slug);
  if (!guide) notFound();

  const ga = getGenreGuide(guide.a);
  const gb = getGenreGuide(guide.b);
  if (!ga || !gb) notFound();

  const aName = genreLabels[guide.a];
  const bName = genreLabels[guide.b];
  const path = `/guides/${slug}`;

  const aArtists = getGenreEssentialArtists(guide.a, 4).map((x) => x.name);
  const bArtists = getGenreEssentialArtists(guide.b, 4).map((x) => x.name);

  const fasterName =
    ga.sound.bpmRange[1] > gb.sound.bpmRange[1]
      ? aName
      : gb.sound.bpmRange[1] > ga.sound.bpmRange[1]
        ? bName
        : null;

  const breadcrumb = [
    { name: "Guides", path: "/guides" },
    { name: `${aName} vs ${bName}`, path },
  ];

  const faqs: FaqItem[] = [
    {
      question: `What is the difference between ${aName} and ${bName}?`,
      answer: `${aName} runs at ${ga.sound.bpmRange[0]}–${ga.sound.bpmRange[1]} BPM and is defined by ${ga.sound.atmosphere.toLowerCase()}, while ${bName} runs at ${gb.sound.bpmRange[0]}–${gb.sound.bpmRange[1]} BPM with ${gb.sound.atmosphere.toLowerCase()}.`,
    },
    ...(fasterName
      ? [
          {
            question: `Is ${aName} faster than ${bName}?`,
            answer: `${fasterName} generally reaches higher tempos. ${aName} tops out around ${ga.sound.bpmRange[1]} BPM and ${bName} around ${gb.sound.bpmRange[1]} BPM.`,
          },
        ]
      : []),
    {
      question: `Which artists play ${aName} and ${bName}?`,
      answer: `${aName} is represented by artists such as ${toSentenceList(aArtists)}. ${bName} includes ${toSentenceList(bArtists)}.`,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl min-w-0 px-4 py-12 sm:py-16">
      <JsonLd data={[breadcrumbSchema(breadcrumb), faqPageSchema(faqs)]} />
      <Breadcrumbs items={breadcrumb} />

      <p className="text-sm text-accent">Guide</p>
      <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
        {aName} vs {bName}
      </h1>
      <p className="mt-3 max-w-3xl text-muted-light">
        Both live in the same warehouses and festival bills, but they prioritise different things.{" "}
        {aName} centres on {ga.sound.atmosphere.toLowerCase()}; {bName} leans into{" "}
        {gb.sound.atmosphere.toLowerCase()}. Here is how they compare, using verified archive data.
      </p>

      <section className="mt-10">
        <div className="grid grid-cols-1 gap-2 border-b border-border pb-4 sm:grid-cols-[10rem_1fr_1fr] sm:gap-4">
          <p className="text-xs uppercase tracking-wider text-muted">Attribute</p>
          <p className="font-serif text-lg text-foreground">{aName}</p>
          <p className="font-serif text-lg text-foreground">{bName}</p>
        </div>
        <StatRow
          label="BPM range"
          a={`${ga.sound.bpmRange[0]}–${ga.sound.bpmRange[1]}`}
          b={`${gb.sound.bpmRange[0]}–${gb.sound.bpmRange[1]}`}
        />
        <StatRow label="Atmosphere" a={ga.sound.atmosphere} b={gb.sound.atmosphere} />
        <StatRow label="Intensity" a={ga.sound.intensity} b={gb.sound.intensity} />
        <StatRow label="Rhythm" a={ga.sound.rhythm} b={gb.sound.rhythm} />
        <StatRow label="Sound design" a={ga.sound.soundDesign} b={gb.sound.soundDesign} />
        <StatRow
          label="Origins"
          a={`${ga.origins.city} · ${ga.origins.decade}`}
          b={`${gb.origins.city} · ${gb.origins.decade}`}
        />
        <StatRow
          label="Defining labels"
          a={ga.essentialLabels.slice(0, 4).join(", ")}
          b={gb.essentialLabels.slice(0, 4).join(", ")}
        />
      </section>

      <div className="mt-10 flex flex-wrap gap-3 text-sm">
        <Link href={`/genres/${guide.a}`} className="chip-selectable border border-border px-4 py-2 text-muted-light">
          {aName} guide →
        </Link>
        <Link href={`/genres/${guide.b}`} className="chip-selectable border border-border px-4 py-2 text-muted-light">
          {bName} guide →
        </Link>
        <Link href={`/artists/genre/${guide.a}`} className="chip-selectable border border-border px-4 py-2 text-muted-light">
          {aName} artists →
        </Link>
        <Link href={`/artists/genre/${guide.b}`} className="chip-selectable border border-border px-4 py-2 text-muted-light">
          {bName} artists →
        </Link>
      </div>

      <FaqSection items={faqs} title={`${aName} vs ${bName} — FAQ`} />

      <p className="mt-12 border-t border-border pt-8 text-sm text-muted">
        More{" "}
        <Link href="/guides" className="text-accent hover:underline">
          archive guides
        </Link>{" "}
        ·{" "}
        <Link href="/genres" className="text-accent hover:underline">
          all genres
        </Link>
      </p>
    </div>
  );
}
