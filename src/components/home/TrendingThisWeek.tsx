"use client";

import type { Artist } from "@/types";
import { getRisingArtists } from "@/content/home/feed";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { HomeSection, HomeCarousel, CarouselItem } from "@/components/home/HomeSection";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { useHomepageRotationRefresh } from "@/components/home/useHomepageRotationRefresh";

export function TrendingThisWeek({ initialRising }: { initialRising: Artist[] }) {
  const rising = useHomepageRotationRefresh(() => getRisingArtists(6), initialRising);

  return (
    <FadeInSection>
      <HomeSection title="Underground Now" href="/artists" linkLabel="Artists">
        <HomeCarousel>
          {rising.slice(0, 6).map((artist, i) => (
            <CarouselItem key={artist.slug}>
              <div className="card-editorial group relative">
                <ArtistCard artist={artist} priority={i < 2} />
              </div>
            </CarouselItem>
          ))}
        </HomeCarousel>
      </HomeSection>
    </FadeInSection>
  );
}
