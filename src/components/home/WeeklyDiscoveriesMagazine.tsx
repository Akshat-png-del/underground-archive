"use client";

import Link from "next/link";
import { getWeeklyDiscoveriesEditorial } from "@/content/home/feed";
import { genreLabels } from "@/content/artists";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { TrackRow } from "@/components/music/TrackRow";
import { SafeImage } from "@/components/ui/SafeImage";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection } from "@/components/home/HomeSection";

export function WeeklyDiscoveriesMagazine() {
  const { artists, tracks, sets } = getWeeklyDiscoveriesEditorial();

  return (
    <FadeInSection>
      <HomeSection
        title="Weekly discoveries"
        subtitle="Editorial picks — emerging voices, essential tracks, and sets to study."
        href="/discover"
        variant="accent"
      >
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">5 emerging artists</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {artists.map((artist, i) => (
                <div key={artist.slug} className={i === 0 ? "sm:col-span-2" : ""}>
                  <ArtistCard
                    slug={artist.slug}
                    name={artist.name}
                    portrait={artist.portrait}
                    genres={artist.genres}
                    city={artist.city}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8 lg:col-span-5">
            <div className="border border-border bg-background/50 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">3 essential tracks</p>
              <ol className="mt-4 space-y-2">
                {tracks.map((track, i) => (
                  <TrackRow key={track.id} track={track} index={i} />
                ))}
              </ol>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">2 recommended sets</p>
              <div className="mt-4 space-y-3">
                {sets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/sets/${set.slug}`}
                    className="card-editorial group flex gap-4 border border-border p-4 hover-glow"
                  >
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden">
                      <SafeImage src={set.thumbnail} alt="" fill sizes="112px" className="image-zoom" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-accent">{set.title}</p>
                      <p className="text-sm text-muted">{set.artistName}</p>
                      <p className="text-xs text-muted-light">
                        {set.genres[0] ? genreLabels[set.genres[0]] : "Techno"} · {set.duration}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </HomeSection>
    </FadeInSection>
  );
}
