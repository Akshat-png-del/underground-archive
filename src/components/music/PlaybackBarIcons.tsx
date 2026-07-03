"use client";

import type { LucideIcon } from "lucide-react";
import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

/** Unified stroke + sizing for bottom-bar transport icons. */
export const BAR_ICON_STROKE = 2;

const SIZE = {
  sm: 16,
  md: 20,
  lg: 22,
} as const;

export function BarIcon({
  icon: Icon,
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const px = SIZE[size];
  return (
    <Icon
      width={px}
      height={px}
      strokeWidth={BAR_ICON_STROKE}
      className={`pointer-events-none ${className}`.trim()}
      aria-hidden
    />
  );
}

export const BarIcons = {
  Play: () => <BarIcon icon={Play} size="lg" />,
  Pause: () => <BarIcon icon={Pause} size="lg" />,
  PlayPause: ({ isPlaying }: { isPlaying: boolean }) =>
    isPlaying ? <BarIcon icon={Pause} size="lg" /> : <BarIcon icon={Play} size="lg" />,
  Previous: () => <BarIcon icon={SkipBack} size="md" />,
  Next: () => <BarIcon icon={SkipForward} size="md" />,
  Shuffle: () => <BarIcon icon={Shuffle} size="sm" />,
  Repeat: () => <BarIcon icon={Repeat} size="sm" />,
  Queue: () => <BarIcon icon={ListMusic} size="md" />,
};
