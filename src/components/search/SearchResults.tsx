"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { searchAll } from "@/lib/search";
import { SearchBar } from "@/components/search/SearchBar";
import { ArtistAlphabetBrowse } from "@/components/search/ArtistAlphabetBrowse";
import { SafeImage } from "@/components/ui/SafeImage";
import { PlayingIndicator } from "@/components/music/PlayingIndicator";
import { playbackItemFromRef, browseContextAt, type PlaybackItem } from "@/lib/music/playback";
import { playableSurfaceClass } from "@/lib/music/playable-surface";
import { useCardPlayback } from "@/lib/music/use-card-playback";
import { resolveSetWatchSlug } from "@/lib/sets/set-watch-navigation";
import type { SearchResult } from "@/types/library";

function NonPlayableSearchResult({ result }: { result: SearchResult }) {
  return (
    <Link href={result.href} className="interactive-row flex items-center gap-4 border border-border p-3">
      {result.image && (
        <div className="relative h-12 w-12 shrink-0">
          <SafeImage src={result.image} alt="" fill sizes="48px" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs uppercase text-accent">{result.type}</p>
        <p className="font-medium text-foreground">{result.title}</p>
        <p className="truncate text-sm text-muted">{result.subtitle}</p>
      </div>
    </Link>
  );
}

function PlayableSearchResultInner({
  result,
  item,
  browseQueue,
  browseIndex,
}: {
  result: SearchResult;
  item: PlaybackItem;
  browseQueue: PlaybackItem[];
  browseIndex: number;
}) {
  const browse = browseContextAt(browseQueue, item, browseIndex);
  const setSlug =
    result.type === "set" ? resolveSetWatchSlug(result.id) ?? undefined : undefined;
  const { handleCardPointerDown, active, playing } = useCardPlayback(
    item,
    result.type as "track" | "set",
    result.id,
    browse,
    setSlug,
  );

  return (
    <div
      onPointerDown={handleCardPointerDown}
      className={`playable-surface flex cursor-pointer touch-manipulation items-center gap-4 rounded-sm px-3 py-3 ${playableSurfaceClass(active, playing)}`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${result.title}` : `Play ${result.title}`}
      aria-current={active ? "true" : undefined}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm">
        {result.image && <SafeImage src={result.image} alt="" fill sizes="48px" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase text-muted">{result.type}</p>
        <p className="font-medium text-foreground">{result.title}</p>
        <p className="truncate text-sm text-muted">{result.subtitle}</p>
      </div>
      {active && <PlayingIndicator playing={playing} compact />}
    </div>
  );
}

function PlayableSearchResult({
  result,
  browseQueue,
  browseIndex,
}: {
  result: SearchResult;
  browseQueue: PlaybackItem[];
  browseIndex: number;
}) {
  if (result.type !== "track" && result.type !== "set") {
    return <NonPlayableSearchResult result={result} />;
  }
  const item = playbackItemFromRef(result.type, result.id);
  if (!item) return <NonPlayableSearchResult result={result} />;
  return (
    <PlayableSearchResultInner
      result={result}
      item={item}
      browseQueue={browseQueue}
      browseIndex={browseIndex}
    />
  );
}

export function SearchResults({ initialQuery }: { initialQuery: string }) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? initialQuery;
  const trimmedQuery = query.trim();
  const results = useMemo(() => searchAll(query), [query]);
  const playableBrowseQueue = useMemo(
    () =>
      results
        .filter((r) => r.type === "track" || r.type === "set")
        .map((r) => playbackItemFromRef(r.type, r.id))
        .filter((item): item is PlaybackItem => !!item),
    [results],
  );

  return (
    <div className="mt-8">
      <SearchBar className="max-w-xl" defaultValue={query} />
      <p className="mt-6 text-sm text-muted">
        {trimmedQuery
          ? `${results.length} results for “${query}”`
          : "Browse artists A–Z or search by name, track, set, or genre"}
      </p>

      {!trimmedQuery && <ArtistAlphabetBrowse />}

      {trimmedQuery && results.length === 0 && (
        <p className="mt-12 text-muted-light">No matches. Try a different spelling or genre name.</p>
      )}

      {trimmedQuery && results.length > 0 && (
        <ul className="mt-8 space-y-2">
          {results.map((r) => {
            const playableIndex =
              r.type === "track" || r.type === "set"
                ? playableBrowseQueue.findIndex(
                    (item) => item.type === r.type && item.refId === r.id,
                  )
                : -1;
            return (
              <li key={`${r.type}-${r.id}`}>
                <PlayableSearchResult
                  result={r}
                  browseQueue={playableBrowseQueue}
                  browseIndex={playableIndex >= 0 ? playableIndex : 0}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
