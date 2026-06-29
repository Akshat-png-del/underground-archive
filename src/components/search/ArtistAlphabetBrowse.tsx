"use client";

import Link from "next/link";
import { useMemo } from "react";
import { groupArtistsAlphabetically } from "@/lib/search";
import { resolvePortrait, resolvePortraitFallbacksForDisplay } from "@/lib/archive/verification";
import { SafeImage } from "@/components/ui/SafeImage";

export function ArtistAlphabetBrowse() {
  const groups = useMemo(() => groupArtistsAlphabetically(), []);

  return (
    <div className="mt-8">
      <nav
        aria-label="Jump to letter"
        className="sticky top-14 z-30 -mx-4 border-b border-border bg-background px-4 py-2"
      >
        <div className="flex flex-wrap gap-1">
          {groups.map(({ letter }) => (
            <a
              key={letter}
              href={`#search-letter-${letter}`}
              className="chip-selectable min-w-[1.75rem] border border-transparent px-1.5 py-0.5 text-center text-xs text-muted hover:text-accent"
            >
              {letter}
            </a>
          ))}
        </div>
      </nav>

      <div className="mt-6 space-y-8">
        {groups.map(({ letter, artists: letterArtists }) => (
          <section key={letter} id={`search-letter-${letter}`} className="scroll-mt-28">
            <h2 className="font-serif text-xl text-accent">{letter}</h2>
            <ul className="mt-3 space-y-2">
              {letterArtists.map((artist) => (
                <li key={artist.slug}>
                  <Link
                    href={`/artists/${artist.slug}`}
                    className="interactive-row flex items-center gap-4 border border-border p-3"
                  >
                    <div className="relative h-12 w-12 shrink-0">
                      <SafeImage
                        src={resolvePortrait(artist)}
                        fallbacks={resolvePortraitFallbacksForDisplay(artist)}
                        alt=""
                        fill
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{artist.name}</p>
                      <p className="truncate text-sm text-muted">
                        {artist.city} · {artist.country}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
