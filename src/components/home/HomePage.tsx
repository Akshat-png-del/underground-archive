import Link from "next/link";
import {
  getArtistOfWeekStatic,
  getEssentialSetOfDayStatic,
  getMostViewedArtistsThisWeekStatic,
  getTrendingSavedArtistsStatic,
  getMostDiscussedArtistsStatic,
  getHorBerlinSectionStatic,
  getHomepageDiscoveryStatic,
} from "@/content/home/feed";
import { getFeaturedArticles } from "@/content/editorial";
import { HomeSection } from "@/components/home/HomeSection";
import { ArtistOfWeekBlock, EssentialSetOfDayBlock } from "@/components/home/HomeRotatingSections";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeContinueListening } from "@/components/home/HomeContinueListening";
import { CommunityPlaylistsSection } from "@/components/home/CommunityPlaylistsSection";
import { TrendingThisWeek } from "@/components/home/TrendingThisWeek";
import { HorBerlinSection } from "@/components/home/HorBerlinSection";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export function HomePage() {
  const discovery = getHomepageDiscoveryStatic();
  const artistOfWeek = getArtistOfWeekStatic();
  const essentialSet = getEssentialSetOfDayStatic();
  const trendingViewed = getMostViewedArtistsThisWeekStatic();
  const trendingSaved = getTrendingSavedArtistsStatic();
  const rising = getMostDiscussedArtistsStatic();
  const horBerlin = getHorBerlinSectionStatic(6);
  const editorials = getFeaturedArticles().slice(0, 3);

  return (
    <>
      <OnboardingModal />

      {/* 1 — Hero: one featured artist, track, and set */}
      <HomeHero initial={discovery} />

      {/* 2 — Continue listening (renders only with real history) */}
      <HomeContinueListening />

      {/* 3 — Trending this week (primary discovery module) */}
      <TrendingThisWeek
        initialViewed={trendingViewed}
        initialSaved={trendingSaved}
        initialRising={rising}
      />

      {/* 4 — Essential set of the day */}
      <EssentialSetOfDayBlock initialSet={essentialSet} />

      {/* 5 — HÖR Berlin */}
      <HorBerlinSection initialSets={horBerlin} />

      {/* 6 — Community playlists */}
      <CommunityPlaylistsSection />

      {/* 7 — Archive guides (max 3) */}
      <FadeInSection>
        <HomeSection title="Archive guides" href="/editorial" variant="accent">
          <div className="grid gap-4 sm:grid-cols-3">
            {editorials.map((a) => (
              <Link
                key={a.slug}
                href={`/editorial/${a.slug}`}
                className="card-editorial group border border-border/80 bg-background/40 p-5 hover-glow"
              >
                <p className="text-xs uppercase tracking-wider text-accent">{a.category.replace(/-/g, " ")}</p>
                <p className="mt-3 font-serif text-xl text-foreground group-hover:text-accent">{a.title}</p>
                <p className="mt-2 text-sm text-muted-light line-clamp-2">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </HomeSection>
      </FadeInSection>

      {/* 8 — Artist of the week (editorial spotlight) */}
      <ArtistOfWeekBlock initialArtist={artistOfWeek} />
    </>
  );
}
