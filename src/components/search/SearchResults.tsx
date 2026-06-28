"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { searchAll } from "@/lib/search";
import { SearchBar } from "@/components/search/SearchBar";
import { SafeImage } from "@/components/ui/SafeImage";

export function SearchResults({ initialQuery }: { initialQuery: string }) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? initialQuery;
  const results = useMemo(() => searchAll(query), [query]);

  return (
    <div className="mt-8">
      <SearchBar className="max-w-xl" defaultValue={query} />
      <p className="mt-6 text-sm text-muted">
        {query.trim() ? `${results.length} results for “${query}”` : "Try Sara Landry, Boiler Room, or industrial techno"}
      </p>

      {query.trim() && results.length === 0 && (
        <p className="mt-12 text-muted-light">No matches. Try a different spelling or genre name.</p>
      )}

      <ul className="mt-8 space-y-2">
        {results.map((r) => (
          <li key={`${r.type}-${r.id}`}>
            <Link
              href={r.href}
              className="flex items-center gap-4 border border-border p-3 hover:border-accent"
            >
              {r.image && (
                <div className="relative h-12 w-12 shrink-0">
                  <SafeImage src={r.image} alt="" fill sizes="48px" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase text-accent">{r.type}</p>
                <p className="font-medium text-foreground">{r.title}</p>
                <p className="truncate text-sm text-muted">{r.subtitle}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
