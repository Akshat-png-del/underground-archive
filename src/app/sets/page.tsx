import type { Metadata } from "next";
import { archiveSets } from "@/content/sets";
import { buildMetadata } from "@/lib/seo/metadata";
import { SetsArchiveBrowser } from "@/components/sets/SetsArchiveBrowser";

export const metadata: Metadata = buildMetadata({
  title: "Essential Sets",
  description:
    "Professionally curated archive of HÖR Berlin, Boiler Room, Awakenings, Verknipt, Teletech, Intercell, and warehouse performances.",
  path: "/sets",
});

export default function SetsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Essential Sets</h1>
      <p className="mt-3 max-w-2xl text-muted-light">
        A premium archive of verified long-form performances — organized by institution, festival,
        and warehouse culture. Every set is at least 10 minutes and mapped to one primary collection.
      </p>

      <SetsArchiveBrowser sets={archiveSets} />
    </div>
  );
}
