import Link from "next/link";
import {
  getGenreGuide,
  getGenreEssentialArtists,
  getGenreEssentialTracks,
  getGenreEssentialSets,
  getGenreRelatedArticles,
  getGenreMoodLabels,
} from "@/content/genres";
import { genreLabels, genreDescriptions } from "@/content/artists";
import type { Genre } from "@/types";
import {
  getGenreRecommendationLabel,
  getRecommendationsForGenre,
} from "@/lib/preferences/recommendations";
import { RecommendationStrip } from "@/components/discovery/RecommendationStrip";
import { ArtistGrid } from "@/components/artists/ArtistGrid";
import { SetRow } from "@/components/music/SetRow";
import { TrackRow } from "@/components/music/TrackRow";
import { playbackItemFromSet, playbackItemFromTrack } from "@/lib/music/playback";
import { FaqSection, type FaqItem } from "@/components/seo/FaqSection";
import { getComparisonGuides } from "@/content/hubs";

interface Props {
  slug: string;
  artistHubCount?: number;
  setCount?: number;
  faqs?: FaqItem[];
}

export function GenrePageContent({ slug, artistHubCount, setCount, faqs }: Props) {
  const name = genreLabels[slug];
  const guide = getGenreGuide(slug);
  const artists = getGenreEssentialArtists(slug);
  const tracks = getGenreEssentialTracks(slug, 15);
  const sets = getGenreEssentialSets(slug, 10);
  const trackBrowseQueue = tracks.map(playbackItemFromTrack);
  const setBrowseQueue = sets.map(playbackItemFromSet);
  const articles = getGenreRelatedArticles(slug);
  const moodLabels = getGenreMoodLabels(slug);
  const comparisons = getComparisonGuides().filter((g) => g.a === slug || g.b === slug);

  if (!name) return null;

  return (
    <>
      <p className="text-sm text-accent">Genre</p>
      <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">{name}</h1>
      <p className="mt-3 max-w-3xl text-muted-light">{guide?.seoIntro ?? genreDescriptions[slug]}</p>

      {moodLabels.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {moodLabels.map((m) => (
            <span key={m} className="border border-border px-3 py-1 text-xs text-muted-light">{m}</span>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        {(artistHubCount ?? 0) > 0 && (
          <Link
            href={`/artists/genre/${slug}`}
            className="chip-selectable border border-border px-4 py-2 text-muted-light"
          >
            All {name} artists{artistHubCount ? ` (${artistHubCount})` : ""} →
          </Link>
        )}
        {(setCount ?? 0) > 0 && (
          <Link
            href={`#essential-sets`}
            className="chip-selectable border border-border px-4 py-2 text-muted-light"
          >
            {name} sets →
          </Link>
        )}
        {comparisons.map((c) => (
          <Link
            key={c.slug}
            href={`/guides/${c.slug}`}
            className="chip-selectable border border-border px-4 py-2 text-muted-light"
          >
            {genreLabels[c.a]} vs {genreLabels[c.b]} →
          </Link>
        ))}
      </div>

      {guide && (
        <>
          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-serif text-2xl text-foreground">Origins</h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border border-border p-4">
                <dt className="text-xs uppercase text-muted">Country</dt>
                <dd className="mt-1 text-foreground">{guide.origins.country}</dd>
              </div>
              <div className="border border-border p-4">
                <dt className="text-xs uppercase text-muted">City</dt>
                <dd className="mt-1 text-foreground">{guide.origins.city}</dd>
              </div>
              <div className="border border-border p-4">
                <dt className="text-xs uppercase text-muted">Decade</dt>
                <dd className="mt-1 text-foreground">{guide.origins.decade}</dd>
              </div>
              <div className="border border-border p-4 sm:col-span-2 lg:col-span-1">
                <dt className="text-xs uppercase text-muted">Context</dt>
                <dd className="mt-1 text-sm text-muted-light">{guide.origins.context}</dd>
              </div>
            </dl>
          </section>

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-serif text-2xl text-foreground">Historical timeline</h2>
            <ol className="mt-6 space-y-4 border-l border-border pl-6">
              {guide.timeline.map((ev) => (
                <li key={ev.year} className="relative">
                  <span className="absolute -left-[1.6rem] top-1 h-2 w-2 rounded-full bg-accent" />
                  <p className="font-mono text-sm text-accent">{ev.year} → {ev.label}</p>
                  <p className="mt-1 text-sm text-muted-light">{ev.description}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-serif text-2xl text-foreground">Sound characteristics</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="border border-border p-4">
                <p className="text-xs uppercase text-muted">BPM range</p>
                <p className="mt-1 text-lg text-accent">{guide.sound.bpmRange[0]}–{guide.sound.bpmRange[1]}</p>
              </div>
              <div className="border border-border p-4">
                <p className="text-xs uppercase text-muted">Atmosphere</p>
                <p className="mt-1 text-sm text-muted-light">{guide.sound.atmosphere}</p>
              </div>
              <div className="border border-border p-4">
                <p className="text-xs uppercase text-muted">Intensity</p>
                <p className="mt-1 text-sm text-muted-light">{guide.sound.intensity}</p>
              </div>
              <div className="border border-border p-4">
                <p className="text-xs uppercase text-muted">Rhythmic structure</p>
                <p className="mt-1 text-sm text-muted-light">{guide.sound.rhythm}</p>
              </div>
              <div className="border border-border p-4 sm:col-span-2">
                <p className="text-xs uppercase text-muted">Sound design</p>
                <p className="mt-1 text-sm text-muted-light">{guide.sound.soundDesign}</p>
              </div>
            </div>
          </section>

          {guide.relatedGenres.length > 0 && (
            <section className="mt-12 border-t border-border pt-10">
              <h2 className="font-serif text-2xl text-foreground">Related genres</h2>
              <div className="mt-6 flex flex-wrap gap-3">
                {guide.relatedGenres.map((g) => (
                  <Link
                    key={g}
                    href={`/genres/${g}`}
                    className="chip-selectable border border-border px-4 py-2 text-sm text-muted-light"
                  >
                    {genreLabels[g]} →
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-serif text-2xl text-foreground">Important labels</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {guide.essentialLabels.map((label) => (
                <span key={label} className="border border-border px-3 py-1 text-xs text-muted-light">{label}</span>
              ))}
            </div>
          </section>

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-serif text-2xl text-foreground">Important clubs</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {guide.essentialClubs.map((club) => (
                <li key={club} className="border border-border px-4 py-3 text-sm text-foreground">{club}</li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="mt-12 border-t border-border pt-10">
        <h2 className="font-serif text-2xl text-foreground">Essential artists</h2>
        <p className="mt-2 text-sm text-muted">{artists.length} artists in the archive</p>
        <div className="mt-6">
          {artists.length > 0 ? <ArtistGrid artists={artists} /> : <p className="text-muted">No artists yet.</p>}
        </div>
      </section>

      {tracks.length > 0 && (
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-serif text-2xl text-foreground">Essential tracks</h2>
          <ol className="mt-6 space-y-3">
            {tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} browseQueue={trackBrowseQueue} />
            ))}
          </ol>
        </section>
      )}

      {sets.length > 0 && (
        <section id="essential-sets" className="mt-12 border-t border-border pt-10">
          <h2 className="font-serif text-2xl text-foreground">Essential sets</h2>
          <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2">
            {sets.map((set, i) => (
              <div key={set.id} className="min-w-0">
                <SetRow
                  set={set}
                  variant="row"
                  meta={`${set.artistName} · ${set.event}`}
                  browseQueue={setBrowseQueue}
                  browseIndex={i}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section className="mt-12 border-t border-border pt-10">
          <h2 className="font-serif text-2xl text-foreground">Archive guides</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {articles.map((a) => (
              <Link key={a.slug} href={`/editorial/${a.slug}`} className="interactive-row group border border-border p-4">
                <p className="text-xs uppercase tracking-wider text-accent">{a.category.replace(/-/g, " ")}</p>
                <p className="mt-2 font-serif text-lg text-foreground group-hover:text-accent">{a.title}</p>
                <p className="mt-2 text-sm text-muted-light line-clamp-2">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {faqs && faqs.length > 0 && <FaqSection items={faqs} title={`${name} — FAQ`} />}

      <RecommendationStrip
        title={getGenreRecommendationLabel(slug as Genre)}
        artists={getRecommendationsForGenre(slug as Genre)}
        href={`/artists/genre/${slug}`}
      />
    </>
  );
}
