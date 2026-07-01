/** Shared visual contract for library rows/cards — one global active item. */
export function playableSurfaceClass(active: boolean, playing: boolean): string {
  const base =
    "transition-all duration-200 ease-out hover:bg-surface-elevated/80";
  if (!active) {
    return `${base} border-transparent bg-transparent`;
  }
  return `${base} playable-surface--active border-l-2 border-l-accent bg-accent/5 ${
    playing ? "playable-surface--playing" : "playable-surface--paused"
  }`;
}
