"use client";

import { useMemo, useState } from "react";
import type { ArchiveSet, SetCategory } from "@/types/library";
import {
  filterArchiveSets,
  getVisibleSetCollections,
  setCategoryLabels,
  setCollectionDescriptions,
} from "@/content/sets";
import { SetsDirectoryGrid } from "@/components/sets/SetsDirectoryGrid";

interface Props {
  sets: ArchiveSet[];
}

export function SetsArchiveBrowser({ sets }: Props) {
  const [collection, setCollection] = useState<SetCategory | "all">("all");

  const visibleCollections = useMemo(() => getVisibleSetCollections(sets), [sets]);
  const counts = useMemo(() => {
    const map = Object.fromEntries(visibleCollections.map((c) => [c, 0])) as Partial<
      Record<SetCategory, number>
    >;
    for (const set of sets) {
      if (map[set.category] === undefined) continue;
      map[set.category] = (map[set.category] ?? 0) + 1;
    }
    return map;
  }, [sets, visibleCollections]);

  const activeCollection =
    collection !== "all" && !visibleCollections.includes(collection) ? "all" : collection;

  const filtered = useMemo(
    () => filterArchiveSets(sets, { collection: activeCollection }),
    [sets, activeCollection],
  );

  return (
    <div className="mt-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-foreground sm:text-2xl">Collections</h2>
            <p className="mt-1 text-sm text-muted-light">
              Every set belongs to one primary collection based on verified venue metadata.
            </p>
          </div>
          {activeCollection !== "all" && (
            <button
              type="button"
              onClick={() => setCollection("all")}
              className="text-xs uppercase tracking-wider text-accent underline-offset-4 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCollection("all")}
            className={`border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
              activeCollection === "all"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-light hover:border-muted"
            }`}
          >
            All ({sets.length})
          </button>
          {visibleCollections.map((cat) => {
            const count = counts[cat] ?? 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCollection(activeCollection === cat ? "all" : cat)}
                className={`border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                  activeCollection === cat
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-light hover:border-muted"
                }`}
                title={setCollectionDescriptions[cat]}
              >
                {setCategoryLabels[cat]}
                <span className="ml-1.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {activeCollection !== "all" && (
          <p className="mt-3 text-sm text-muted-light">
            {setCollectionDescriptions[activeCollection]}
          </p>
        )}
      </section>

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          {filtered.length} set{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 border border-border px-5 py-10 text-center text-sm text-muted-light">
          No sets in this collection.
        </p>
      ) : (
        <SetsDirectoryGrid sets={filtered} />
      )}
    </div>
  );
}
