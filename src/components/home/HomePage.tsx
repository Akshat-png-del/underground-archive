import {
  getArtistOfWeekStatic,
  getEssentialSetOfDayStatic,
  getRisingArtists,
  getHorBerlinSectionStatic,
  getHomepageDiscoveryStatic,
} from "@/content/home/feed";
import { ArtistOfWeekBlock, EssentialSetOfDayBlock } from "@/components/home/HomeRotatingSections";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeContinueListening } from "@/components/home/HomeContinueListening";
import { CommunityPlaylistsSection } from "@/components/home/CommunityPlaylistsSection";
import { TrendingThisWeek } from "@/components/home/TrendingThisWeek";
import { HorBerlinSection } from "@/components/home/HorBerlinSection";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export function HomePage() {
  const discovery = getHomepageDiscoveryStatic();
  const artistOfWeek = getArtistOfWeekStatic();
  const essentialSet = getEssentialSetOfDayStatic();
  const rising = getRisingArtists(6);
  const horBerlin = getHorBerlinSectionStatic(6);

  return (
    <>
      <OnboardingModal />

      {/* 1 — Hero: one featured artist, track, and set */}
      <HomeHero initial={discovery} />

      {/* 2 — Continue listening (renders only with real history) */}
      <HomeContinueListening />

      {/* 3 — Today's Selection: featured performance */}
      <EssentialSetOfDayBlock initialSet={essentialSet} />

      {/* 4 — Live Archive: HÖR Berlin */}
      <HorBerlinSection initialSets={horBerlin} />

      {/* 5 — Discover: rising underground */}
      <TrendingThisWeek initialRising={rising} />

      {/* 6 — Community */}
      <CommunityPlaylistsSection />

      {/* 7 — Editor's Pick: closing spotlight */}
      <ArtistOfWeekBlock initialArtist={artistOfWeek} />
    </>
  );
}
