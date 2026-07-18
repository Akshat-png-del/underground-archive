"use client";

import { useMemo } from "react";
import { useLibrary } from "@/context/LibraryContext";
import { HistoryPlayRow } from "@/components/music/HistoryPlayRow";
import { playbackItemFromRef } from "@/lib/music/playback";
import { FadeInSection } from "@/components/ui/FadeInSection";
import { HomeSection } from "@/components/home/HomeSection";
import { hydrateHistoryEntry } from "@/lib/library/resolve-display";

/**
 * "Continue listening" — renders only when the user actually has playback history.
 * No empty state: if there is no history, the section is not rendered at all.
 */
export function HomeContinueListening() {
  const { history, ready } = useLibrary();

  const entries = useMemo(
    () =>
      history
        .map(hydrateHistoryEntry)
        .filter((h): h is NonNullable<typeof h> => !!h)
        .slice(0, 4),
    [history],
  );

  const browseQueue = useMemo(
    () =>
      entries
        .map((h) => playbackItemFromRef(h.type, h.refId))
        .filter((item): item is NonNullable<typeof item> => !!item),
    [entries],
  );

  if (!ready || entries.length === 0) return null;

  return (
    <FadeInSection>
      <HomeSection title="Continue listening" href="/library/history" linkLabel="History">
        <ul className="grid gap-2 sm:grid-cols-2">
          {entries.map((h, i) => (
            <li key={h.id}>
              <HistoryPlayRow
                entry={h}
                browseQueue={browseQueue}
                browseIndex={i}
                className="card-editorial"
              />
            </li>
          ))}
        </ul>
      </HomeSection>
    </FadeInSection>
  );
}
