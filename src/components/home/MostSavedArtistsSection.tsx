"use client";

import type { Artist } from "@/types";
import { getMostSavedArtists } from "@/content/home/feed";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { SocialBadge } from "@/components/ui/SocialBadge";
import { HomeSection, HomeCarousel, CarouselItem } from "@/components/home/HomeSection";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { useHomepageRotationRefresh } from "@/components/home/useHomepageRotationRefresh";

export function MostSavedArtistsSection({
  initialArtists,
}: {
  initialArtists: Artist[];
}) {
  const artists = useHomepageRotationRefresh(getMostSavedArtists, initialArtists);

  return (
    <FadeInSection>
      <HomeSection title="Most saved artists" subtitle="Listeners are archiving these profiles." href="/artists" variant="surface">
        <div className="mb-6">
          <SocialBadge variant="saved" />
        </div>
        <HomeCarousel>
          {artists.slice(0, 6).map((artist) => (
            <CarouselItem key={artist.slug}>
              <ArtistCard artist={artist} />
            </CarouselItem>
          ))}
        </HomeCarousel>
      </HomeSection>
    </FadeInSection>
  );
}
