"use client";

import Link from "next/link";
import type { Artist } from "@/types";
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(166,30,30,0.1),transparent_55%)]" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          Editor&apos;s Pick
        </p>
        <h2 className="mt-3 font-serif text-4xl text-foreground sm:text-6xl">{artist.name}</h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-light">
          {artist.editorialBio.breakthrough}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {artist.genres.slice(0, 3).map((g) => (
            <span key={g} className="border border-border/70 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-muted-light">
              {genreLabels[g]}
            </span>
          ))}
        </div>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href={`/artists/${artist.slug}`}>
            <Button size="lg">Explore</Button>
          </Link>
          <Link href={`/artists?genre=${artist.genres[0]}`}>
            <Button variant="outline" size="lg">
              Similar sound
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
