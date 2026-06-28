"use client";

import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { SafeImage } from "@/components/ui/SafeImage";

export function LibraryHistory() {
  const { history } = useLibrary();

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">History</h1>
      <p className="mt-2 text-muted-light">Recently played tracks and sets</p>
      {history.length === 0 ? (
        <p className="mt-12 text-muted">Your listening history will appear here.</p>
      ) : (
        <ul className="mt-10 space-y-2">
          {history.map((h) => (
            <li key={h.id} className="flex items-center gap-4 border border-border p-3">
              <div className="relative h-12 w-12 shrink-0">
                <SafeImage src={h.coverArt} alt="" fill sizes="48px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{h.title}</p>
                <p className="text-xs text-muted">{h.subtitle}</p>
              </div>
              <time className="text-xs text-muted shrink-0">
                {new Date(h.playedAt).toLocaleDateString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
