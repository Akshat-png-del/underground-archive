"use client";

import { useMemo, useState } from "react";
import { getSet, getDisplaySets } from "@/content/sets";
import { useLibrary } from "@/context/LibraryContext";
import { SetRow } from "@/components/music/SetRow";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { playbackItemFromSet } from "@/lib/music/playback";

const BROWSE_PAGE = 40;

export function LibrarySavedSets() {
  const { savedSets, ready } = useLibrary();
  const [query, setQuery] = useState("");
  const [browseLimit, setBrowseLimit] = useState(BROWSE_PAGE);

  const q = query.trim().toLowerCase();

  const saved = useMemo(() => {
    const sets = savedSets
      .map((id) => getSet(id))
      .filter((s): s is NonNullable<typeof s> => !!s);
    if (!q) return sets;
    return sets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artistName.toLowerCase().includes(q) ||
        s.event.toLowerCase().includes(q),
    );
  }, [savedSets, q]);

  const savedQueue = useMemo(() => saved.map(playbackItemFromSet), [saved]);

  const catalog = useMemo(() => {
    const all = getDisplaySets();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artistName.toLowerCase().includes(q) ||
        s.event.toLowerCase().includes(q),
    );
  }, [q]);

  const browseSets = catalog.slice(0, browseLimit);
  const browseQueue = useMemo(() => browseSets.map(playbackItemFromSet), [browseSets]);

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Sets</h1>
      <div className="mt-6">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setBrowseLimit(BROWSE_PAGE);
          }}
          placeholder="Search sets…"
          aria-label="Search sets"
        />
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-foreground">Saved</h2>
        <p className="mt-1 text-sm text-muted">{saved.length} saved</p>
        {!ready ? (
          <p className="mt-6 text-sm text-muted" role="status">Loading saved sets…</p>
        ) : saved.length === 0 ? (
          <div className="mt-6 rounded-sm border border-dashed border-border px-6 py-10 text-center">
            <p className="text-foreground">No saved sets yet</p>
            <p className="mt-1 text-sm text-muted">
              Save sets from the catalog below or from a set page.
            </p>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-border/50">
            {saved.map((set, i) => (
              <SetRow key={set.id} set={set} browseQueue={savedQueue} browseIndex={i} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-serif text-xl text-foreground">Browse sets</h2>
        <p className="mt-1 text-sm text-muted">
          {catalog.length} sets{q ? " matching search" : ""}
        </p>
        {browseSets.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No sets match that search.</p>
        ) : (
          <>
            <div className="mt-6 divide-y divide-border/50">
              {browseSets.map((set, i) => (
                <SetRow key={set.id} set={set} browseQueue={browseQueue} browseIndex={i} />
              ))}
            </div>
            {browseLimit < catalog.length ? (
              <div className="mt-6">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBrowseLimit((n) => n + BROWSE_PAGE)}
                >
                  Show more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
