import type { Metadata } from "next";
import { archiveSets, setCategoryLabels } from "@/content/sets";
import type { SetCategory } from "@/types/library";
import { buildMetadata } from "@/lib/seo/metadata";
import { SetsDirectoryGrid } from "@/components/sets/SetsDirectoryGrid";

export const metadata: Metadata = buildMetadata({
  title: "Essential Sets",
  description: "Boiler Room, HÖR Berlin, Awakenings, Teletech, and festival performances from underground electronic artists.",
  path: "/sets",
});

const categories = Object.keys(setCategoryLabels) as SetCategory[];

export default function SetsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Essential Sets</h1>
      <p className="mt-3 text-muted-light">
        Live performances from Boiler Room, HÖR Berlin, Awakenings, Teletech, and underground institutions.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <span key={cat} className="border border-border px-3 py-1 text-xs text-muted-light">
            {setCategoryLabels[cat]}
          </span>
        ))}
      </div>

      <SetsDirectoryGrid sets={archiveSets} />
    </div>
  );
}
