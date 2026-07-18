"use client";

import { useMemo } from "react";
import { getSet } from "@/content/sets";
import { useLibrary } from "@/context/LibraryContext";
import { SetRow } from "@/components/music/SetRow";
import { playbackItemFromSet } from "@/lib/music/playback";

export function LibrarySavedSets() {
  const { savedSets } = useLibrary();
  const sets = useMemo(
    () => savedSets.map((id) => getSet(id)).filter((s): s is NonNullable<typeof s> => !!s),
    [savedSets],
  );
  const browseQueue = useMemo(() => sets.map(playbackItemFromSet), [sets]);

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Saved Sets</h1>
      <p className="mt-2 text-sm text-muted">Tap any set to play in the bottom player.</p>
      {sets.length === 0 ? (
        <p className="mt-12 text-muted">Save live sets from artist pages or the sets directory.</p>
      ) : (
        <div className="mt-8 divide-y divide-border/50">
          {sets.map((set, i) => (
            <SetRow key={set.id} set={set} browseQueue={browseQueue} browseIndex={i} />
          ))}
        </div>
      )}
    </div>
  );
}
