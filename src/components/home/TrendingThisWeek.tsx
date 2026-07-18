"use client";

import { useState } from "react";
import type { Artist } from "@/types";
import {
  getMostViewedArtistsThisWeek,
  getTrendingSavedArtists,
  getRisingArtists,
} from "@/content/home/feed";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { HomeSection, HomeCarousel, CarouselItem } from "@/components/home/HomeSection";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { useHomepageRotationRefresh } from "@/components/home/useHomepageRotationRefresh";

type TabKey = "viewed" | "saved" | "rising";

const TABS: { key: TabKey; label: string }[] = [
  { key: "viewed", label: "Most viewed" },
  { key: "saved", label: "Most saved" },
  { key: "rising", label: "Rising" },
];

export function TrendingThisWeek({
  initialViewed,
  initialSaved,
  initialRising,
}: {
  initialViewed: Artist[];
  initialSaved: Artist[];
  initialRising: Artist[];
}) {
  const [tab, setTab] = useState<TabKey>("viewed");

  const viewed = useHomepageRotationRefresh(getMostViewedArtistsThisWeek, initialViewed);
  const saved = useHomepageRotationRefresh(getTrendingSavedArtists, initialSaved);
  const rising = useHomepageRotationRefresh(() => getRisingArtists(6), initialRising);

  const artists =
    tab === "viewed" ? viewed.slice(0, 6) : tab === "saved" ? saved.slice(0, 6) : rising.slice(0, 6);

  return (
    <FadeInSection>
      <HomeSection title="Trending this week" badge="Live" href="/discover">
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                tab === t.key
                  ? "border-accent bg-accent text-background"
                  : "border-border text-muted-light hover:border-accent/50 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <HomeCarousel>
          {artists.map((artist, i) => (
            <CarouselItem key={`${tab}-${artist.slug}`}>
              <div className="card-editorial group relative">
                {tab === "viewed" && (
                  <span className="absolute left-3 top-3 z-10 font-mono text-2xl text-accent/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <ArtistCard artist={artist} priority={i < 2} />
              </div>
            </CarouselItem>
          ))}
        </HomeCarousel>
      </HomeSection>
    </FadeInSection>
  );
}
