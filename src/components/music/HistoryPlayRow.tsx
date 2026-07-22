"use client";

import { useMemo } from "react";
import { Bookmark, ListPlus } from "lucide-react";
import type { PlayHistoryEntry } from "@/types/library";
import { LibraryArtwork } from "@/components/library/LibraryArtwork";
import { PlayingIndicator } from "@/components/music/PlayingIndicator";
import { usePlaylistModal } from "@/components/library/PlaylistModal";
import { useLibrary } from "@/context/LibraryContext";
import { useRequireLibraryAuth } from "@/hooks/useRequireLibraryAuth";
import { playbackItemFromRef, browseContextAt, type PlaybackItem } from "@/lib/music/playback";
import { playableSurfaceClass } from "@/lib/music/playable-surface";
import {
  useCardPlayback,
  playbackItemActive,
  playbackItemPlaying,
} from "@/lib/music/use-card-playback";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { resolveSetWatchSlug } from "@/lib/sets/set-watch-navigation";
import { hydrateHistoryEntry } from "@/lib/library/resolve-display";

interface HistoryPlayRowProps {
  entry: PlayHistoryEntry;
  browseQueue?: PlaybackItem[];
  browseIndex?: number;
  trailing?: React.ReactNode;
  className?: string;
}

export function HistoryPlayRow({
  entry: rawEntry,
  browseQueue,
  browseIndex,
  trailing,
  className = "",
}: HistoryPlayRowProps) {
  const entry = useMemo(() => hydrateHistoryEntry(rawEntry), [rawEntry]);
  const item = useMemo(
    () => (entry ? playbackItemFromRef(entry.type, entry.refId) : null),
    [entry],
  );

  if (!entry || !item) return null;

  return (
    <HistoryPlayRowInner
      entry={entry}
      item={item}
      browseQueue={browseQueue}
      browseIndex={browseIndex}
      trailing={trailing}
      className={className}
    />
  );
}

function HistoryPlayRowInner({
  entry,
  item,
  browseQueue,
  browseIndex,
  trailing,
  className = "",
}: {
  entry: PlayHistoryEntry;
  item: PlaybackItem;
  browseQueue?: PlaybackItem[];
  browseIndex?: number;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const browse = browseQueue ? browseContextAt(browseQueue, item, browseIndex) : undefined;
  const setSlug =
    entry.type === "set" ? resolveSetWatchSlug(entry.refId) ?? undefined : undefined;
  const snapshot = useFinalPlaybackSnapshot();
  const active = playbackItemActive(snapshot, entry.type, entry.refId);
  const playing = playbackItemPlaying(snapshot, entry.type, entry.refId);
  const { openAddToPlaylist } = usePlaylistModal();
  const { isSetSaved, toggleSaveSet } = useLibrary();
  const requireAuth = useRequireLibraryAuth();
  const saved = entry.type === "set" ? isSetSaved(entry.refId) : false;
  const { handleCardPointerDown, stopCardPointerDown } = useCardPlayback(
    item,
    entry.type,
    entry.refId,
    browse,
    setSlug,
  );

  return (
    <div
      onPointerDown={handleCardPointerDown}
      className={`playable-surface flex cursor-pointer touch-manipulation items-center gap-3 rounded-sm px-3 py-2.5 ${playableSurfaceClass(active, playing)} ${className}`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${entry.title}` : `Play ${entry.title}`}
      aria-current={active ? "true" : undefined}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm">
        <LibraryArtwork src={entry.coverArt} alt="" fill sizes="40px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{entry.subtitle || entry.title}</p>
        {entry.subtitle ? (
          <p className="truncate text-sm text-foreground/90">{entry.title}</p>
        ) : null}
      </div>
      {active && <PlayingIndicator playing={playing} compact />}
      {entry.type === "track" ? (
        <button
          type="button"
          className="shrink-0 rounded-sm p-2 text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label={`Add ${entry.title} to playlist`}
          title="Add to playlist"
          onPointerDown={stopCardPointerDown}
          onClick={(event) => {
            event.stopPropagation();
            openAddToPlaylist({
              type: "track",
              refId: entry.refId,
              label: entry.subtitle
                ? `${entry.title} — ${entry.subtitle}`
                : entry.title,
            });
          }}
        >
          <ListPlus className="h-4 w-4 text-accent" />
        </button>
      ) : null}
      {entry.type === "set" ? (
        <button
          type="button"
          className="shrink-0 rounded-sm p-2 text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label={saved ? `Unsave ${entry.title}` : `Save ${entry.title}`}
          title={saved ? "Saved" : "Save set"}
          onPointerDown={stopCardPointerDown}
          onClick={(event) => {
            event.stopPropagation();
            if (!requireAuth()) return;
            toggleSaveSet(entry.refId);
          }}
        >
          <Bookmark className={`h-4 w-4 text-accent ${saved ? "fill-accent" : ""}`} />
        </button>
      ) : null}
      {trailing && <div onPointerDown={stopCardPointerDown}>{trailing}</div>}
    </div>
  );
}
