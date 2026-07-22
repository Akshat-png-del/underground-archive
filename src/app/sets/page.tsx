import type { Metadata } from "next";
import {
  getCollectionCounts,
  getVisibleSetCollections,
  mixtapeSets,
} from "@/content/sets";
import { buildMetadata } from "@/lib/seo/metadata";
import { SetsArchiveBrowser } from "@/components/sets/SetsArchiveBrowser";
import { BestSetsSelect } from "@/components/sets/BestSetsSelect";

export const metadata: Metadata = buildMetadata({
  title: "Mixtapes & DJ Sets",
  description:
    "Verified long-form DJ mixes and live sets from HÖR Berlin, Boiler Room, Awakenings, Verknipt, Teletech, Intercell, and warehouse performances.",
  path: "/sets",
});

export default function SetsPage() {
  const counts = getCollectionCounts();
  const collections = getVisibleSetCollections(mixtapeSets).filter(
    (category) => counts[category] > 6,
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
        Mixtapes &amp; DJ Sets
      </h1>
      <BestSetsSelect collections={collections} />
      <SetsArchiveBrowser sets={mixtapeSets} />
    </div>
  );
}
