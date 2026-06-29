"use client";

import Link from "next/link";
import { useLibrary, getBecauseYouListened } from "@/context/LibraryContext";
import { getRecommendedTracks } from "@/content/tracks";
import { archiveSets } from "@/content/sets";
import { SetRow } from "@/components/music/SetRow";
import { HistoryPlayRow } from "@/components/music/HistoryPlayRow";
import { SafeImage } from "@/components/ui/SafeImage";
import { TrackRow } from "@/components/music/TrackRow";
import { ArtistCard } from "@/components/artists/ArtistCard";

export function HomeRetentionSections() {
  const { history, publicPlaylists, savedSets } = useLibrary();
  const continueItems = history.slice(0, 4);
  const lastArtist = history[0]?.type === "track"
    ? history[0].refId.split("::")[0]
    : undefined;
  const recommended = lastArtist ? getRecommendedTracks(lastArtist, 4) : [];
  const becauseYou = getBecauseYouListened(history);
  const trendingPlaylists = publicPlaylists.slice(0, 4);
  const mostSaved = archiveSets.slice(0, 4);

  return (
    <>
      {continueItems.length > 0 && (
        <section className="border-t border-border px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Continue listening</h2>
            <ul className="mt-6 space-y-2">
              {continueItems.map((h) => (
                <li key={h.id}>
                  <HistoryPlayRow entry={h} className="card-editorial" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="border-t border-border bg-surface px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Trending playlists</h2>
            <Link href="/library/playlists" className="text-sm text-accent hover:underline">Your playlists</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trendingPlaylists.map((p) => (
              <Link key={p.id} href={`/playlists/${p.id}`} className="interactive-row border border-border p-4">
                <div className="relative mb-3 aspect-square w-full">
                  <SafeImage src={p.coverImage} alt="" fill sizes="25vw" />
                </div>
                <p className="font-medium text-foreground">{p.title}</p>
                <p className="text-xs text-muted">{p.creatorName} · {p.likeCount} likes</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Editor&apos;s picks — essential sets</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {mostSaved.map((set) => (
              <SetRow key={set.id} set={set} variant="row" meta={`${set.artistName} · ${set.event}`} />
            ))}
          </div>
        </div>
      </section>

      {recommended.length > 0 && (
        <section className="border-t border-border bg-surface px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Recommended tracks</h2>
            <ol className="mt-6 space-y-3">
              {recommended.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} />
              ))}
            </ol>
          </div>
        </section>
      )}

      {becauseYou.length > 0 && (
        <section className="px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Because you listened recently</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {becauseYou.map((a) => a && (
                <ArtistCard key={a.slug} artist={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {savedSets.length > 0 && (
        <section className="border-t border-border px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Your saved sets</h2>
            <p className="mt-2 text-sm text-muted">
              <Link href="/library/sets" className="text-accent hover:underline">View all in library →</Link>
            </p>
          </div>
        </section>
      )}
    </>
  );
}
