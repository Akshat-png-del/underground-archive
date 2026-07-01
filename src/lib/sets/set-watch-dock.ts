type SetWatchDockListener = (active: boolean) => void;

/** FROZEN — see docs/sets-video-architecture-freeze.md. Coordinates engine dock ownership with audio fallback mount. */

let active = false;

const listeners = new Set<SetWatchDockListener>();

/** Set watch page owns engine docking — audio mount must yield. */
export function claimSetWatchDock(): void {
  if (active) return;
  active = true;
  for (const listener of listeners) listener(true);
}

export function releaseSetWatchDock(): void {
  if (!active) return;
  active = false;
  for (const listener of listeners) listener(false);
}

export function isSetWatchDockActive(): boolean {
  return active;
}

export function subscribeSetWatchDock(listener: SetWatchDockListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
