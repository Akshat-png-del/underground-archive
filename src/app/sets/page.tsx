import type { Metadata } from "next";
import { getVisibleSetCollections, mixtapeSets } from "@/content/sets";
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
  const collections = getVisibleSetCollections(mixtapeSets);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
        Mixtapes &amp; DJ Sets
      </h1>
      <p className="mt-3 max-w-2xl text-muted-light">
        Long-form mixes and live recordings, kept separate from Spotify audio playlists. Every
        performance has a verified source and API-confirmed duration of at least 10 minutes.
      </p>
      <BestSetsSelect collections={collections} />
      <SetsArchiveBrowser sets={mixtapeSets} />
    </div>
  );
}
