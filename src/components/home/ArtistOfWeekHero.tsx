"use client";

import Link from "next/link";
import type { Artist } from "@/types";
import { artists } from "@/content/artists";
import { archiveSets } from "@/content/sets";
import { articles } from "@/content/editorial";
import { resolveHeroImage, resolveHeroFallbacks } from "@/lib/archive/verification";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { genreLabels } from "@/content/artists";

export function ArtistOfWeekHero({ artist }: { artist: Artist }) {
  const heroSrc = resolveHeroImage(artist);
  const heroFallbacks = resolveHeroFallbacks(artist);
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0">
        <Link href={`/artists/${artist.slug}`} className="block h-full w-full" aria-label={`View ${artist.name}`}>
          <SafeImage
            src={heroSrc}
            fallbacks={heroFallbacks}
            alt=""
            fill
            priority
            sizes="100vw"
            className="opacity-40 transition-opacity duration-500 hover:opacity-50"
          />
        </Link>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,255,0,0.12),transparent_55%)]" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
          Artist of the Week · {artist.city}
        </p>
        <h2 className="mt-3 font-serif text-4xl text-foreground sm:text-6xl">{artist.name}</h2>
        <p className="mt-4 max-w-xl text-muted-light">{artist.editorialBio.breakthrough}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {artist.genres.slice(0, 3).map((g) => (
            <span key={g} className="border border-border/80 px-2 py-0.5 text-xs text-muted-light">
              {genreLabels[g]}
            </span>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/artists/${artist.slug}`}>
            <Button size="lg">Explore profile</Button>
          </Link>
          <Link href={`/discover?genre=${artist.genres[0]}`}>
            <Button variant="outline" size="lg">
              Similar sound
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function LiveTicker() {
  const items = [
    "Trending: Klangkuenstler",
    "Essential Set of the Day",
    `${artists.length} artists in the archive`,
    `${archiveSets.length}+ curated sets`,
    `${articles.length} archive guides`,
    "Build your library →",
  ];

  return (
    <div className="border-b border-border bg-surface-elevated py-2 overflow-hidden">
      <div className="ticker-track flex whitespace-nowrap font-mono text-[11px] uppercase tracking-widest text-muted-light">
        {[...items, ...items].map((item, i) => (
          <span key={`${item}-${i}`} className="mx-8 inline-flex items-center gap-2">
            <span className="live-pulse h-1 w-1 rounded-full bg-accent" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
