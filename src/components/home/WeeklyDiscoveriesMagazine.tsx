"use client";

import { useEffect, useState } from "react";
import { getWeeklyDiscoveriesEditorial } from "@/content/home/feed";
import type { WeeklyDiscoveriesEditorial } from "@/content/home/feed";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { TrackRow } from "@/components/music/TrackRow";
import { SetRow } from "@/components/music/SetRow";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection } from "@/components/home/HomeSection";

export function WeeklyDiscoveriesMagazine({
  initialEditorial,
}: {
  initialEditorial: WeeklyDiscoveriesEditorial;
}) {
  const [editorial, setEditorial] = useState<WeeklyDiscoveriesEditorial>(initialEditorial);

  useEffect(() => {
    setEditorial(getWeeklyDiscoveriesEditorial());
  }, []);

  const { artists, tracks, sets } = editorial;

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
                  <ArtistCard artist={artist} />
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
                  <SetRow key={set.id} set={set} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </HomeSection>
    </FadeInSection>
  );
}
