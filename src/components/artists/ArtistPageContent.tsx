import Link from "next/link";
import type { Artist } from "@/types";
import { genreLabels, getArtist } from "@/content/artists";
import { resolvePortrait, resolvePortraitFallbacksForDisplay, resolveHeroImage, resolveHeroFallbacks } from "@/lib/archive/verification";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { CareerTimeline } from "./CareerTimeline";
import { ArtistCard } from "./ArtistCard";
import { ArtistMusicSection } from "./ArtistMusicSection";
import { ArtistSaveButton } from "./ArtistSaveButton";
import { ArtistFollowButton } from "./ArtistFollowButton";
import { getRecommendationsForArtist, getArtistRecommendationLabel } from "@/lib/preferences/recommendations";
import { RecommendationStrip } from "@/components/discovery/RecommendationStrip";
import { ListeningPath } from "./ListeningPath";
import { ArtistProfilePortrait } from "./ArtistProfilePortrait";

interface Props {
  artist: Artist;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-12">
      <h2 className="font-serif text-2xl text-foreground sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function ArtistPageContent({ artist }: Props) {
  const similar = artist.similarArtists
    .filter((s) => s !== artist.slug)
    .map((s) => getArtist(s))
    .filter((a): a is Artist => !!a)
    .slice(0, 6);

  const { externalLinks: links } = artist;
  const portraitSrc = resolvePortrait(artist);
  const portraitFallbacks = resolvePortraitFallbacksForDisplay(artist);
  const heroSrc = resolveHeroImage(artist);
  const heroFallbacks = resolveHeroFallbacks(artist);

  return (
    <>
      {/* Hero */}
      <section className="relative border-b border-border">
        <div className="relative h-64 sm:h-80">
          <SafeImage
            src={heroSrc}
            fallbacks={heroFallbacks}
            alt=""
            fill
            priority
            sizes="100vw"
            className="opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-10">
          <div className="relative -mt-16 flex flex-col gap-6 sm:flex-row sm:items-end">
            <ArtistProfilePortrait
              src={portraitSrc}
              fallbacks={portraitFallbacks}
              name={artist.name}
              className="h-28 w-28 shrink-0 sm:h-36 sm:w-36"
            />
            <div className="flex-1">
              <h1 className="font-serif text-4xl text-foreground sm:text-5xl">{artist.name}</h1>
              <p className="mt-2 text-muted">{artist.city}, {artist.country} · Since {artist.activeSince}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {artist.genres.map((g) => (
                  <Link
                    key={g}
                    href={`/genres/${g}`}
                    className="chip-selectable inline-block border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-light hover:text-accent"
                  >
                    {genreLabels[g]}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {links.spotify && (
              <a href={links.spotify} target="_blank" rel="noopener noreferrer">
                <Button size="sm">Listen on Spotify</Button>
              </a>
            )}
            {links.youtube && (
              <a href={links.youtube} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">Watch on YouTube</Button>
              </a>
            )}
            {links.instagram && (
              <a href={links.instagram} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">Follow on Instagram</Button>
              </a>
            )}
            {links.residentAdvisor && (
              <a href={links.residentAdvisor} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">Resident Advisor</Button>
              </a>
            )}
            {links.soundcloud && (
              <a href={links.soundcloud} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">SoundCloud</Button>
              </a>
            )}
            <ArtistSaveButton slug={artist.slug} />
            <ArtistFollowButton slug={artist.slug} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_260px]">
          <div className="min-w-0 space-y-0">
            {/* Bio */}
            <section>
              <h2 className="font-serif text-2xl text-foreground">Biography</h2>
              <div className="prose-archive mt-6 space-y-4">
                <p>{artist.editorialBio.origins}</p>
                <p>{artist.editorialBio.earlyCareer}</p>
                <p>{artist.editorialBio.breakthrough}</p>
                <p>{artist.editorialBio.soundEvolution}</p>
                <p>{artist.editorialBio.presentDay}</p>
              </div>
            </section>

            <ArtistMusicSection artist={artist} />

            <Section title="New here? Start here">
              {artist.listeningPath.length > 0 ? (
                <ListeningPath artist={artist} />
              ) : (
                <p className="text-muted-light">
                  Start with top tracks above
                  {similar.length > 0 ? ", then explore similar artists below." : "."}
                </p>
              )}
            </Section>

            <Section title="Similar artists">
              {similar.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {similar.map((a) => (
                    <ArtistCard key={a.slug} artist={a} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-light">
                  Browse{" "}
                  <Link href={`/genres/${artist.genres[0]}`} className="text-accent hover:underline">
                    {genreLabels[artist.genres[0]]}
                  </Link>{" "}
                  for related artists.
                </p>
              )}
            </Section>

            <RecommendationStrip
              title={getArtistRecommendationLabel(artist.name)}
              artists={getRecommendationsForArtist(artist.slug)}
              href={`/discover?genre=${artist.genres[0]}`}
            />

            <Section title="Community">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-border p-5">
                  <p className="text-3xl font-serif text-accent">{artist.essentialSets.length}</p>
                  <p className="text-sm text-muted">Essential sets archived</p>
                </div>
                <div className="border border-border p-5">
                  <p className="text-3xl font-serif text-accent">{artist.similarArtists.length}</p>
                  <p className="text-sm text-muted">Similar artists to explore</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <ArtistSaveButton slug={artist.slug} />
                <ArtistFollowButton slug={artist.slug} />
                <Link href="/library/playlists">
                  <Button variant="outline" size="sm">Browse community playlists</Button>
                </Link>
              </div>
            </Section>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-6">
              <div className="border border-border p-5 text-sm">
                <p className="font-medium text-foreground">Quick facts</p>
                <dl className="mt-4 space-y-3">
                  <div><dt className="text-muted">Scene</dt><dd>{artist.scene}</dd></div>
                  {artist.labels.length > 0 && (
                    <div><dt className="text-muted">Labels</dt><dd>{artist.labels.join(", ")}</dd></div>
                  )}
                  {artist.collectives.length > 0 && (
                    <div><dt className="text-muted">Collectives</dt><dd>{artist.collectives.join(", ")}</dd></div>
                  )}
                </dl>
              </div>
              <div className="border border-border p-5">
                <p className="text-sm font-medium text-foreground">Timeline</p>
                <div className="mt-4">
                  <CareerTimeline events={artist.careerTimeline} />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile timeline */}
        <div className="mt-12 border-t border-border pt-12 lg:hidden">
          <h2 className="font-serif text-2xl text-foreground">Career timeline</h2>
          <div className="mt-6">
            <CareerTimeline events={artist.careerTimeline} />
          </div>
        </div>
      </div>
    </>
  );
}
