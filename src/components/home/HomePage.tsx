import Link from "next/link";
import {
  getArtistOfWeek,
  getEssentialSetOfDay,
  getNewUndergroundReleases,
  getMostSavedArtists,
} from "@/content/home/feed";
import { getFeaturedArticles } from "@/content/editorial";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { HomeSection, HomeCarousel, CarouselItem } from "@/components/home/HomeSection";
import { ArtistOfWeekHero, LiveTicker } from "@/components/home/ArtistOfWeekHero";
import { HomeFollowingStrip } from "@/components/home/HomeFollowingStrip";
import { TrendingThisWeek } from "@/components/home/TrendingThisWeek";
import { EssentialSetOfDayHero } from "@/components/home/EssentialSetOfDayHero";
import { WeeklyDiscoveriesMagazine } from "@/components/home/WeeklyDiscoveriesMagazine";
import { CommunityPlaylistsSection } from "@/components/home/CommunityPlaylistsSection";
import { CommunityFavoritesHub } from "@/components/home/CommunityFavoritesHub";
import { TodaysDiscovery } from "@/components/home/TodaysDiscovery";
import { HomePersonalizedStrip } from "@/components/home/HomePersonalizedStrip";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { SocialBadge } from "@/components/ui/SocialBadge";

export function HomePage() {
  const artistOfWeek = getArtistOfWeek();
  const setOfDay = getEssentialSetOfDay();
  const releases = getNewUndergroundReleases();
  const mostSaved = getMostSavedArtists();
  const editorials = getFeaturedArticles().slice(0, 3);

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
      <ArtistOfWeekHero artist={artistOfWeek} />
      <HomeFollowingStrip />
      <TodaysDiscovery />
      <HomePersonalizedStrip />
      <TrendingThisWeek />
      <EssentialSetOfDayHero set={setOfDay} />
      <WeeklyDiscoveriesMagazine />
      <CommunityPlaylistsSection />

      <FadeInSection>
        <HomeSection title="New underground releases" subtitle="Latest from verified artists in the archive." href="/artists">
          <HomeCarousel>
            {releases.map((r) => (
              <CarouselItem key={`${r.artistSlug}-${r.title}`}>
                <Link href={`/artists/${r.artistSlug}`} className="card-editorial group block border border-border p-4 hover-glow">
                  <div className="relative mb-4 aspect-square w-full overflow-hidden">
                    <SafeImage src={r.coverArt} alt="" fill sizes="30vw" className="image-zoom" />
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
                <ArtistCard
                  slug={artist.slug}
                  name={artist.name}
                  portrait={artist.portrait}
                  genres={artist.genres}
                  city={artist.city}
                />
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
