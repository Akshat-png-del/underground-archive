"use client";

import { useLibrary } from "@/context/LibraryContext";
import { HistoryPlayRow } from "@/components/music/HistoryPlayRow";
import { formatDisplayDateTime } from "@/lib/format";

export function LibraryHistory() {
  const { history, ready } = useLibrary();

  if (!ready) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-foreground">History</h1>
        <p className="mt-2 text-muted-light">Recently played tracks and sets</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">History</h1>
      <p className="mt-2 text-muted-light">Recently played tracks and sets</p>
      {history.length === 0 ? (
        <p className="mt-12 text-muted">Your listening history will appear here.</p>
      ) : (
        <ul className="mt-10 space-y-2">
          {history.map((h) => (
            <li key={h.id}>
              <HistoryPlayRow
                entry={h}
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
