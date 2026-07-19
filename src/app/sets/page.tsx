import type { Metadata } from "next";
import { archiveSets, getVisibleSetCollections } from "@/content/sets";
import { buildMetadata } from "@/lib/seo/metadata";
import { SetsArchiveBrowser } from "@/components/sets/SetsArchiveBrowser";
import { BestSetsSelect } from "@/components/sets/BestSetsSelect";

export const metadata: Metadata = buildMetadata({
  title: "Essential Sets",
  description:
    "Professionally curated archive of HÖR Berlin, Boiler Room, Awakenings, Verknipt, Teletech, Intercell, and warehouse performances.",
  path: "/sets",
});

export default function SetsPage() {
  const collections = getVisibleSetCollections(archiveSets);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Essential Sets</h1>
      <BestSetsSelect collections={collections} />
      <SetsArchiveBrowser sets={archiveSets} />
    </div>
  );
}
