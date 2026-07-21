"use client";

import { useMemo } from "react";
import { getSet } from "@/content/sets";
import { useLibrary } from "@/context/LibraryContext";
import { SetRow } from "@/components/music/SetRow";
import { playbackItemFromSet } from "@/lib/music/playback";

export function LibrarySavedSets() {
  const { savedSets, ready } = useLibrary();
  const sets = useMemo(
    () => savedSets.map((id) => getSet(id)).filter((s): s is NonNullable<typeof s> => !!s),
    [savedSets],
  );
  const browseQueue = useMemo(() => sets.map(playbackItemFromSet), [sets]);

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Saved Sets</h1>
      <p className="mt-2 text-sm text-muted">Tap any set to play in the bottom player.</p>
      {!ready ? (
        <p className="mt-10 text-sm text-muted" role="status">Loading saved sets…</p>
      ) : sets.length === 0 ? (
        <div className="mt-10 rounded-sm border border-dashed border-border px-6 py-10 text-center">
          <p className="text-foreground">No saved sets yet</p>
          <p className="mt-1 text-sm text-muted">Save live sets from artist pages or the sets directory.</p>
        </div>
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
