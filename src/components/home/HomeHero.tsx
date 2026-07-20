"use client";

import Link from "next/link";
import type { Artist } from "@/types";
import type { ArchiveSet, CatalogTrack } from "@/types/library";
import { getHomepageDiscovery } from "@/content/home/feed";
import { genreLabels } from "@/content/artists";
import { resolveHeroImage, resolveHeroFallbacks } from "@/lib/archive/verification";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { SetRow } from "@/components/music/SetRow";
import { TrackRow } from "@/components/music/TrackRow";
import { useHomepageRotationRefresh } from "@/components/home/useHomepageRotationRefresh";

export interface HomeHeroData {
  artist: Artist;
  set: ArchiveSet;
  track: CatalogTrack;
}

/**
 * Immersive editorial hero: one featured artist, one featured set, one featured track.
 * The featured trio is exposure-budgeted (see content/home/exposure-budget) so none of
 * these appear again elsewhere on the homepage.
 */
export function HomeHero({ initial }: { initial: HomeHeroData }) {
  const data = useHomepageRotationRefresh(getHomepageDiscovery, initial);
  const { artist, set, track } = data;
  const heroSrc = resolveHeroImage(artist);
  const heroFallbacks = resolveHeroFallbacks(artist);

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-0">
        <Link href={`/artists/${artist.slug}`} className="block h-full w-full" aria-label={`View ${artist.name}`}>
          <SafeImage
            src={heroSrc}
            fallbacks={heroFallbacks}
            alt=""
            fill
            priority
            sizes="100vw"
            className="opacity-[0.35] transition-opacity duration-700 hover:opacity-45"
          />
        </Link>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(166,30,30,0.1),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
            Featured Artist
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
            {artist.name}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-light">
            {artist.editorialBio?.breakthrough}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {artist.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="border border-border/70 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-muted-light"
              >
                {genreLabels[g]}
              </span>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" href={`/artists/${artist.slug}`}>
              Explore
            </Button>
            <Button variant="outline" size="lg" href="/artists">
              Artists
            </Button>
          </div>
        </div>

        <div className="rounded-sm border border-border/60 bg-background/60 p-4 backdrop-blur-sm sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Latest Set</p>
          <div className="mt-3">
            <SetRow set={set} meta={`${set.duration ?? "—"} · ${set.event}`} />
          </div>
          <div className="my-4 h-px bg-border/60" />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Selected Track</p>
          <div className="mt-3">
            <TrackRow track={track} />
          </div>
        </div>
      </div>
    </section>
  );
}
