"use client";

import Link from "next/link";
import {
  getMostSavedArtists,
  getMostViewedArtistsThisWeek,
  getTrendingGenresThisWeek,
} from "@/content/home/feed";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { SocialBadge } from "@/components/ui/SocialBadge";
import { HomeSection, HomeCarousel, CarouselItem } from "@/components/home/HomeSection";
import { FadeInSection } from "@/components/ui/FadeInSection";

export function TrendingThisWeek() {
  const viewed = getMostViewedArtistsThisWeek();
  const saved = getMostSavedArtists();
  const genres = getTrendingGenresThisWeek();

  return (
    <FadeInSection>
      <HomeSection
        title="Trending this week"
        subtitle="What the underground is watching, saving, and exploring."
        badge="Live"
        href="/discover"
      >
        <div className="space-y-10">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Most viewed</h3>
              <SocialBadge variant="trending" />
            </div>
            <HomeCarousel>
              {viewed.map((artist, i) => (
                <CarouselItem key={artist.slug}>
                  <div className="card-editorial group relative">
                    <span className="absolute left-3 top-3 z-10 font-mono text-2xl text-accent/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <ArtistCard
                      slug={artist.slug}
                      name={artist.name}
                      portrait={artist.portrait}
                      genres={artist.genres}
                      city={artist.city}
                    />
                  </div>
                </CarouselItem>
              ))}
            </HomeCarousel>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-3">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Most saved</h3>
              <SocialBadge variant="saved" />
            </div>
            <HomeCarousel>
              {saved.slice(0, 6).map((artist) => (
                <CarouselItem key={`saved-${artist.slug}`}>
                  <div className="card-editorial">
                    <ArtistCard
                      slug={artist.slug}
                      name={artist.name}
                      portrait={artist.portrait}
                      genres={artist.genres}
                      city={artist.city}
                    />
                  </div>
                </CarouselItem>
              ))}
            </HomeCarousel>
          </div>

          <div>
            <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">Trending genres</h3>
            <HomeCarousel>
              {genres.map((g) => (
                <CarouselItem key={g.slug} className="min-w-[55%] sm:min-w-[35%] lg:min-w-[22%]">
                  <Link
                    href={`/genres/${g.slug}`}
                    className="card-editorial group flex h-full flex-col justify-between border border-border bg-surface-elevated p-6 hover-glow"
                  >
                    <p className="font-serif text-2xl text-foreground group-hover:text-accent">{g.name}</p>
                    <p className="mt-4 font-mono text-xs text-muted">{g.count} artists archived</p>
                  </Link>
                </CarouselItem>
              ))}
            </HomeCarousel>
          </div>
        </div>
      </HomeSection>
    </FadeInSection>
  );
}
