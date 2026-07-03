"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { reapplyPlaybackEmbedLayout } from "@/stores/playback-store";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { usePersistentPlaybackDock } from "@/components/music/use-persistent-playback-dock";
import { registerPlaybackMediaAnchor } from "@/lib/music/playback-media-anchor-registry";
import { logMediaEngineActive } from "@/lib/music/media-binding-debug";
import { usePlaybackExperience } from "@/lib/music/use-playback-experience";
import { isSetWatchDockActive, subscribeSetWatchDock } from "@/lib/sets/set-watch-dock";
import { hydrationPipelineTrace } from "@/lib/music/hydration-pipeline-trace";

/**
 * Fallback engine canvas for audio playback when the set watch page is not active.
 * Client-only — avoids SSR/client DOM mismatch for playback mount nodes.
 */
export function PlaybackEngineMount() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const currentRefId = useFinalPlaybackSnapshot().activeTrack?.refId ?? null;
  const experience = usePlaybackExperience();
  const [clientMounted, setClientMounted] = useState(false);
  const [, syncSetWatchDock] = useState(0);

  useLayoutEffect(() => {
    setClientMounted(true);
    hydrationPipelineTrace({
      fn: "PlaybackEngineMount",
      phase: "mount",
      extra: { clientMounted: true },
    });
  }, []);

  useLayoutEffect(() => {
    return subscribeSetWatchDock(() => {
      syncSetWatchDock((n) => n + 1);
    });
  }, []);

  const audioDockEnabled = clientMounted && !isSetWatchDockActive();
  usePersistentPlaybackDock(canvasRef, audioDockEnabled);

  useLayoutEffect(() => {
    if (!audioDockEnabled) return;
    const canvas = canvasRef.current;
    if (canvas?.isConnected) {
      registerPlaybackMediaAnchor(canvas);
    }
  }, [audioDockEnabled]);

  useLayoutEffect(() => {
    if (!audioDockEnabled) return;
    logMediaEngineActive({
      docked: !!canvasRef.current,
      refId: currentRefId,
      video: experience === "video",
      stageOpen: false,
    });
    reapplyPlaybackEmbedLayout();
  }, [currentRefId, experience, audioDockEnabled]);

  if (!audioDockEnabled) {
    return null;
  }

  return (
    <div className="playback-engine-mount" data-playback-engine-mount aria-hidden>
      <div
        id="media-engine-canvas"
        ref={canvasRef}
        data-player-embed-host
        data-playback-persistent-mount
        className="playback-canvas h-full w-full overflow-hidden"
      />
    </div>
  );
}
