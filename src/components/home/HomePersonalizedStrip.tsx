"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { getRecentlyAddedTracks } from "@/content/home/feed";
import { getArtist } from "@/content/artists";
import { HistoryPlayRow } from "@/components/music/HistoryPlayRow";
import { TrackRow } from "@/components/music/TrackRow";
import { LibraryArtwork } from "@/components/library/LibraryArtwork";
import { playbackItemFromRef, playbackItemFromTrack } from "@/lib/music/playback";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection } from "@/components/home/HomeSection";
import {
  hydrateHistoryEntry,
  hydrateRecentlyViewedEntry,
  isPlaceholderArtwork,
  resolveLibraryCoverArt,
} from "@/lib/library/resolve-display";
import { resolvePortrait } from "@/lib/archive/verification";
import type { RecentlyViewedEntry } from "@/types/library";

const recentTracksCache = getRecentlyAddedTracks(4);
const recentTrackBrowseQueueCache = recentTracksCache.map(playbackItemFromTrack);

/** Homepage Recently Viewed: artist portrait / Spotify track art / YouTube set thumb. */
function recentlyViewedArtwork(entry: RecentlyViewedEntry): string {
  if (entry.type === "artist") {
    const artist = getArtist(entry.refId);
    if (!artist) return "";
    const portrait = resolvePortrait(artist);
    return isPlaceholderArtwork(portrait) ? "" : portrait;
  }
  if (entry.type === "track" || entry.type === "set") {
    return resolveLibraryCoverArt(entry.type, entry.refId);
  }
  return isPlaceholderArtwork(entry.coverArt) ? "" : entry.coverArt;
}

export function HomePersonalizedStrip() {
  const { history, recentlyViewed, savedSets, ready } = useLibrary();

  const historyEntries = useMemo(
    () =>
      history
        .map(hydrateHistoryEntry)
        .filter((h): h is NonNullable<typeof h> => !!h)
        .slice(0, 4),
    [history],
  );
  const viewed = useMemo(
    () =>
      recentlyViewed
        .map(hydrateRecentlyViewedEntry)
        .filter((v): v is NonNullable<typeof v> => !!v)
        .slice(0, 4)
        .map((v) => ({ ...v, coverArt: recentlyViewedArtwork(v) })),
    [recentlyViewed],
  );
  const historyBrowseQueue = useMemo(
    () =>
      historyEntries
        .map((h) => playbackItemFromRef(h.type, h.refId))
        .filter((item): item is NonNullable<typeof item> => !!item),
    [historyEntries],
  );

  if (!ready) return null;
  const hasActivity = historyEntries.length > 0 || viewed.length > 0 || savedSets.length > 0;
  if (!hasActivity) return null;

  return (
    <FadeInSection>
      <HomeSection title="Your feed" subtitle="Pick up where you left off." badge="For you">
        <div className="grid gap-8 lg:grid-cols-2">
          {historyEntries.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Continue listening</h3>
              <ul className="mt-4 space-y-2">
                {historyEntries.map((h, i) => (
                  <li key={h.id}>
                    <HistoryPlayRow
                      entry={h}
                      browseQueue={historyBrowseQueue}
                      browseIndex={i}
                      className="card-editorial"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {viewed.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Recently viewed</h3>
              <ul className="mt-4 space-y-2">
                {viewed.map((v) => (
                  <li key={`${v.type}-${v.refId}`}>
                    <Link href={v.href} className="card-editorial flex items-center gap-3 border border-border p-3 hover-glow">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm">
                        <LibraryArtwork src={v.coverArt} alt="" fill sizes="40px" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{v.title}</p>
                        {v.subtitle ? <p className="text-xs text-muted">{v.subtitle}</p> : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {savedSets.length > 0 && (
            <div className="lg:col-span-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Saved sets</h3>
              <p className="mt-2 text-sm text-muted">
                <Link href="/library/sets" className="text-accent hover:underline">
                  {savedSets.length} sets in your library →
                </Link>
              </p>
            </div>
          )}

          <div className="lg:col-span-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted">Recently added tracks</h3>
            <ol className="mt-4 space-y-2">
              {recentTracksCache.slice(0, 3).map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} browseQueue={recentTrackBrowseQueueCache} />
              ))}
            </ol>
          </div>
        </div>
      </HomeSection>
    </FadeInSection>
  );
}
