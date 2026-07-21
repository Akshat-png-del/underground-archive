"use client";

import { useMemo } from "react";
import { useLibrary } from "@/context/LibraryContext";
import { HistoryPlayRow } from "@/components/music/HistoryPlayRow";
import { formatDisplayDateTime } from "@/lib/format";
import { hydrateHistoryEntry } from "@/lib/library/resolve-display";
import { playbackItemFromRef } from "@/lib/music/playback";

export function LibraryHistory() {
  const { history, ready } = useLibrary();
  const entries = useMemo(
    () =>
      history
        .map(hydrateHistoryEntry)
        .filter((h): h is NonNullable<typeof h> => !!h),
    [history],
  );
  const browseQueue = useMemo(
    () =>
      entries
        .map((h) => playbackItemFromRef(h.type, h.refId))
        .filter((item): item is NonNullable<typeof item> => !!item),
    [entries],
  );

  if (!ready) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-foreground">History</h1>
        <p className="mt-2 text-muted-light">Recently played tracks and sets</p>
        <p className="mt-10 text-sm text-muted" role="status">Loading listening history…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">History</h1>
      <p className="mt-2 text-muted-light">Recently played tracks and sets</p>
      {entries.length === 0 ? (
        <div className="mt-10 rounded-sm border border-dashed border-border px-6 py-10 text-center">
          <p className="text-foreground">Nothing played yet</p>
          <p className="mt-1 text-sm text-muted">Your listening history will appear here.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border/60">
          {entries.map((h, i) => (
            <li key={h.id}>
              <HistoryPlayRow
                entry={h}
                browseQueue={browseQueue}
                browseIndex={i}
                trailing={
                  <time className="shrink-0 text-xs text-muted">
                    {formatDisplayDateTime(h.playedAt)}
                  </time>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
