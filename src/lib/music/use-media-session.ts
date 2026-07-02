"use client";

import { useSyncExternalStore } from "react";
import {
  mediaSessionController,
  type MediaSessionState,
  mediaSessionDisplayTime,
} from "@/lib/music/media-session-controller";

export function useMediaSession(): MediaSessionState {
  return useSyncExternalStore(
    mediaSessionController.subscribe,
    mediaSessionController.getSnapshot,
    mediaSessionController.getSnapshot,
  );
}

export function useMediaSessionDisplayTime(): number {
  const session = useMediaSession();
  return mediaSessionDisplayTime(session);
}
