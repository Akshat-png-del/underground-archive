"use client";

export function PlayingIndicator({
  playing,
  compact,
}: {
  playing: boolean;
  compact?: boolean;
}) {
  if (!playing) {
    return (
      <span
        className={`inline-flex shrink-0 items-center font-mono uppercase tracking-widest text-muted ${
          compact ? "text-[9px]" : "text-[10px]"
        }`}
        aria-hidden
      >
        Paused
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 font-mono uppercase tracking-widest text-accent ${
        compact ? "text-[9px]" : "text-[10px]"
      }`}
      aria-label="Now playing"
    >
      <span className="flex h-3 items-end gap-0.5" aria-hidden>
        <span className="playing-eq-bar h-2 w-0.5 bg-accent" />
        <span className="playing-eq-bar playing-eq-bar--2 h-3 w-0.5 bg-accent" />
        <span className="playing-eq-bar playing-eq-bar--3 h-1.5 w-0.5 bg-accent" />
      </span>
      Now playing
    </span>
  );
}
