import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchResults } from "@/components/search/SearchResults";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Search",
  description: "Search artists, tracks, sets, genres, and editorial.",
  path: "/search",
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-serif text-3xl text-foreground">Search</h1>
      <Suspense fallback={<p className="mt-8 text-muted">Loading search...</p>}>
        <SearchResults initialQuery={q ?? ""} />
      </Suspense>
    </div>
  );
}
