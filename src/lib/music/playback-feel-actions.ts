/**
 * @deprecated Feel-clock optimistic UI removed — delegates to controller only.
 */
import { mediaSessionController } from "@/lib/music/media-session-controller";

export function feelTogglePlayPause(): void {
  mediaSessionController.togglePlayPause();
}

export function feelPlay(): void {
  mediaSessionController.play();
}

export function feelPause(): void {
  mediaSessionController.pause();
}
