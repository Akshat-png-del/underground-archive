"use client";

import { useCallback, useEffect, type RefObject } from "react";

/** Fullscreen on the unified player shell wrapper (not the iframe). */
export function usePlayerFullscreen(shellRef: RefObject<HTMLElement | null>) {
  const enterFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell?.requestFullscreen) return;
    if (document.fullscreenElement === shell) return;
    try {
      await shell.requestFullscreen();
    } catch {
      // blocked by browser policy
    }
  }, [shellRef]);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // ignore
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement === shellRef.current) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [shellRef, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const onChange = () => {
      document.body.classList.toggle("player-fullscreen-active", document.fullscreenElement === shellRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.body.classList.remove("player-fullscreen-active");
    };
  }, [shellRef]);

  return { enterFullscreen, exitFullscreen, toggleFullscreen, isFullscreen: false };
}
