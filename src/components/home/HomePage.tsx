import Link from "next/link";
import {
  getNewUndergroundReleases,
  getMostSavedArtists,
  getArtistOfWeekStatic,
  getEssentialSetOfDayStatic,
  getWeeklyDiscoveriesEditorialStatic,
  getMostViewedArtistsThisWeekStatic,
  getTrendingGenresThisWeekStatic,
} from "@/content/home/feed";
import { getTodaysDiscoveryStatic } from "@/lib/preferences/recommendations";
import { DEFAULT_PREFERENCES } from "@/types/preferences";
import { getFeaturedArticles } from "@/content/editorial";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { TrackArtwork } from "@/components/music/TrackArtwork";
import { getArtist } from "@/content/artists";
import { Button } from "@/components/ui/Button";
import { HomeSection, HomeCarousel, CarouselItem } from "@/components/home/HomeSection";
import { ArtistOfWeekBlock, EssentialSetOfDayBlock } from "@/components/home/HomeRotatingSections";
import { LiveTicker } from "@/components/home/ArtistOfWeekHero";
import { WeeklyDiscoveriesMagazine } from "@/components/home/WeeklyDiscoveriesMagazine";
import { CommunityPlaylistsSection } from "@/components/home/CommunityPlaylistsSection";
import { CommunityFavoritesHub } from "@/components/home/CommunityFavoritesHub";
import { TodaysDiscovery } from "@/components/home/TodaysDiscovery";
import { HomePersonalizedStrip } from "@/components/home/HomePersonalizedStrip";
import { HomeFollowingStrip } from "@/components/home/HomeFollowingStrip";
import { TrendingThisWeek } from "@/components/home/TrendingThisWeek";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { SocialBadge } from "@/components/ui/SocialBadge";

export function HomePage() {
  const releases = getNewUndergroundReleases();
  const mostSaved = getMostSavedArtists();
  const editorials = getFeaturedArticles().slice(0, 3);
  const artistOfWeek = getArtistOfWeekStatic();
  const essentialSet = getEssentialSetOfDayStatic();
  const weeklyEditorial = getWeeklyDiscoveriesEditorialStatic();
  const todaysDiscovery = getTodaysDiscoveryStatic(DEFAULT_PREFERENCES);
  const trendingViewed = getMostViewedArtistsThisWeekStatic();
  const trendingGenres = getTrendingGenresThisWeekStatic();

  return (
    <>
      <OnboardingModal />

      <section className="relative overflow-hidden border-b border-border bg-surface px-4 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(200,255,0,0.1),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">The Underground Archive</p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.1] text-foreground sm:text-6xl lg:text-7xl">
            A living cultural feed for underground electronic music
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-light">
            Hard techno, schranz, industrial, EBM, darkwave — curated discovery, community playlists, and editorial depth.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/discover"><Button size="lg">Start discovering</Button></Link>
            <Link href="/editorial"><Button variant="outline" size="lg">Explore the archive</Button></Link>
          </div>
        </div>
      </section>

      <LiveTicker />
      <ArtistOfWeekBlock initialArtist={artistOfWeek} />
      <HomeFollowingStrip />
      <TodaysDiscovery initialDiscovery={todaysDiscovery} />
      <HomePersonalizedStrip />
      <TrendingThisWeek initialViewed={trendingViewed} initialGenres={trendingGenres} />
      <EssentialSetOfDayBlock initialSet={essentialSet} />
      <WeeklyDiscoveriesMagazine initialEditorial={weeklyEditorial} />
      <CommunityPlaylistsSection />

      <FadeInSection>
        <HomeSection title="New underground releases" subtitle="Latest from verified artists in the archive." href="/artists">
          <HomeCarousel>
            {releases.map((r) => (
              <CarouselItem key={`${r.artistSlug}-${r.title}`}>
                <Link href={`/artists/${r.artistSlug}`} className="card-editorial group block border border-border p-4 hover-glow">
                  <div className="relative mb-4 aspect-square w-full overflow-hidden">
                    <TrackArtwork
                      coverArt={r.coverArt}
                      genres={getArtist(r.artistSlug)?.genres}
                      alt=""
                      fill
                      sizes="30vw"
                      className="image-zoom"
                    />
                  </div>
                  <p className="font-serif text-lg text-foreground group-hover:text-accent">{r.title}</p>
                  <p className="text-sm text-muted">{r.artist} · {r.year}</p>
                </Link>
              </CarouselItem>
            ))}
          </HomeCarousel>
        </HomeSection>
      </FadeInSection>

      <FadeInSection>
        <HomeSection title="Most saved artists" subtitle="Listeners are archiving these profiles." href="/artists" variant="surface">
          <div className="mb-6">
            <SocialBadge variant="saved" />
          </div>
          <HomeCarousel>
            {mostSaved.slice(0, 6).map((artist) => (
              <CarouselItem key={artist.slug}>
                <ArtistCard artist={artist} />
              </CarouselItem>
            ))}
          </HomeCarousel>
        </HomeSection>
      </FadeInSection>

      <CommunityFavoritesHub />

      <FadeInSection>
        <HomeSection title="Archive guides" href="/editorial" variant="accent">
          <div className="grid gap-4 sm:grid-cols-3">
            {editorials.map((a) => (
              <Link key={a.slug} href={`/editorial/${a.slug}`} className="card-editorial group border border-border/80 bg-background/40 p-5 hover-glow">
                <p className="text-xs uppercase tracking-wider text-accent">{a.category.replace(/-/g, " ")}</p>
                <p className="mt-3 font-serif text-xl text-foreground group-hover:text-accent">{a.title}</p>
                <p className="mt-2 text-sm text-muted-light line-clamp-2">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </HomeSection>
      </FadeInSection>
    </>
  );
}
