"use client";

import { useState, useCallback, type MouseEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { ListMusic } from "lucide-react";
import { usePlaybackStore } from "@/stores/playback-store";
import { playItem } from "@/lib/music/playback-actions";
import type { PlaybackItem } from "@/lib/music/playback";
import { resolveSetWatchSlug, setWatchPath } from "@/lib/sets/set-watch-navigation";

function stopEvent(e: PointerEvent | MouseEvent): void {
  e.stopPropagation();
}

export function PlaybackQueuePanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const queue = usePlaybackStore((s) => s.queue);
  const queueIndex = usePlaybackStore((s) => s.queueIndex);
  const current = usePlaybackStore((s) => s.currentTrack);

  const playQueueItem = useCallback(
    (item: PlaybackItem, index: number) => {
      if (item.type === "set") {
        const slug = resolveSetWatchSlug(item.refId);
        if (slug) {
          router.push(setWatchPath(slug));
          setOpen(false);
          return;
        }
      }
      const q = usePlaybackStore.getState().queue;
      playItem(item, { browse: { queue: q, queueIndex: index } });
      setOpen(false);
    },
    [router],
  );

  if (queue.length === 0) return null;

  return (
    <div className="relative" onPointerDown={stopEvent} onClick={stopEvent}>
      <button
        type="button"
        data-player-control
        className="player-control-btn flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated hover:text-accent"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={`Queue, ${queue.length} items`}
      >
        <ListMusic className="h-5 w-5" />
      </button>
      {open && (
        <div
          className="player-queue-panel absolute bottom-full right-0 z-10 mb-2 max-h-64 w-72 overflow-y-auto border border-border bg-surface shadow-xl"
          role="listbox"
          aria-label="Playback queue"
        >
          <p className="border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            Queue · {queue.length}
          </p>
          <ul className="py-1">
            {queue.map((item, index) => {
              const active = current?.refId === item.refId && queueIndex === index;
              return (
                <li key={`${item.type}-${item.refId}-${index}`}>
                  <button
                    type="button"
                    data-player-control
                    role="option"
                    aria-selected={active}
                    className={`player-queue-item w-full px-3 py-2 text-left transition-colors hover:bg-surface-elevated ${
                      active ? "border-l-2 border-l-accent bg-surface-elevated/80" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playQueueItem(item, index);
                    }}
                  >
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted">{item.subtitle}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
