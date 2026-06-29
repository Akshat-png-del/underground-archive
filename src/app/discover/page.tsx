"use client";

import { useState } from "react";
import Link from "next/link";
import {
  artistCollections,
  getArtistsByCollection,
  getCollectionArtistCount,
  type ArtistCollectionSlug,
} from "@/content/artists";
import type { DiscoveryFilters } from "@/types";
import { discoverArtists, DISCOVERY_PRESETS } from "@/lib/discovery";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { Button } from "@/components/ui/Button";

const collectionList = Object.entries(artistCollections) as [
  ArtistCollectionSlug,
  (typeof artistCollections)[ArtistCollectionSlug],
][];

export default function DiscoverPage() {
  const [filters, setFilters] = useState<DiscoveryFilters>({});
  const [activeCollection, setActiveCollection] = useState<ArtistCollectionSlug | null>(null);

  const collectionResults = activeCollection ? getArtistsByCollection(activeCollection) : null;
  const filterResults = discoverArtists(filters);
  const results = collectionResults ?? filterResults;

  const applyPreset = (preset: (typeof DISCOVERY_PRESETS)[0]) => {
    setActiveCollection(null);
    setFilters(preset.filters);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Discover</h1>
      <p className="mt-3 text-muted-light">Explore presets and curated collections.</p>

      <section className="mt-8">
        <h2 className="font-serif text-lg text-foreground">Quick presets</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {DISCOVERY_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="chip-selectable border border-border px-3 py-1.5 text-sm text-muted-light"
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10 border border-border p-6 sm:p-8">
        <h2 className="font-serif text-xl text-foreground sm:text-2xl">Curated collections</h2>
        <p className="mt-2 text-sm text-muted-light">
          Editor-picked lists spanning industrial darkness, modern hard techno, and festival peak-time.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {collectionList.map(([slug, col]) => (
            <button
              key={slug}
              type="button"
              onClick={() => {
                setFilters({});
                setActiveCollection(activeCollection === slug ? null : slug);
              }}
              className={`chip-selectable border p-4 text-left transition-colors ${
                activeCollection === slug
                  ? "is-selected border-accent bg-accent/5"
                  : "border-border hover:border-muted"
              }`}
            >
              <h3 className="font-medium text-foreground">{col.title}</h3>
              <p className="mt-2 text-xs text-muted-light line-clamp-2">{col.description}</p>
              <p className="mt-3 text-xs text-muted">{getCollectionArtistCount(slug)} artists</p>
            </button>
          ))}
        </div>
        {activeCollection && (
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setActiveCollection(null)}>
              Clear collection
            </Button>
          </div>
        )}
      </section>

      <p className="mt-8 text-sm text-muted">
        {results.length} artists
        {activeCollection ? ` in ${artistCollections[activeCollection].title}` : ""}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {results.map((artist) => (
          <ArtistCard key={artist.slug} artist={artist} />
        ))}
      </div>

      {results.length === 0 && (
        <p className="mt-12 text-center text-muted-light">
          No artists match.{" "}
          <Link href="/artists" className="text-accent underline-offset-4 hover:underline">Browse all artists</Link>
        </p>
      )}
    </div>
  );
}
