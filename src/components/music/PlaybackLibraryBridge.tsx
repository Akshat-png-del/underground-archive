"use client";

import { useEffect } from "react";
import { useLibrary } from "@/context/LibraryContext";
import { setPlaybackRecordFn } from "@/stores/playback-store";

/** Bridges library history into playback without coupling providers at mount time. */
export function PlaybackLibraryBridge() {
  const { recordPlay } = useLibrary();

  useEffect(() => {
    setPlaybackRecordFn(recordPlay);
  }, [recordPlay]);

  return null;
}
