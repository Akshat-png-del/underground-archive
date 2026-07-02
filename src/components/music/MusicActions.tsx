"use client";

import { type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Heart, ListPlus, Pause, Play, Share2 } from "lucide-react";
import type { LibraryItemType } from "@/types/library";
import { useLibrary } from "@/context/LibraryContext";
import { usePlaylistModal } from "@/components/library/PlaylistModal";
import { Button } from "@/components/ui/Button";
import { playbackItemFromMusicActions } from "@/lib/music/playback";
import { handlePlaybackSurfaceClick } from "@/lib/music/playback-actions";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { resolveSetWatchSlug, setWatchPath } from "@/lib/sets/set-watch-navigation";

interface MusicActionsProps {
  type: LibraryItemType;
  refId: string;
  label: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  compact?: boolean;
}

export function MusicActions({
  type,
  refId,
  label,
  spotifyUrl,
  youtubeUrl,
  youtubeId,
  compact,
}: MusicActionsProps) {
  const router = useRouter();
  const { openAddToPlaylist } = usePlaylistModal();
  const { toggleLikeTrack, toggleLikeSet, isTrackLiked, isSetLiked } = useLibrary();
  const snapshot = useFinalPlaybackSnapshot();
  const active =
    snapshot.activeTrack?.type === type && snapshot.activeTrack?.refId === refId;
  const playing = active && snapshot.isPlaying;

  const liked = type === "track" ? isTrackLiked(refId) : type === "set" ? isSetLiked(refId) : false;

  const item = playbackItemFromMusicActions({
    type,
    refId,
    label,
    spotifyUrl,
    youtubeUrl,
    youtubeId,
  });

  const handlePlay = (e: MouseEvent) => {
    e.stopPropagation();
    if (type === "set") {
      const slug = resolveSetWatchSlug(refId);
      if (slug) {
        router.push(setWatchPath(slug));
        return;
      }
    }
    handlePlaybackSurfaceClick(item, type, refId);
  };

  const handleLike = (e: MouseEvent) => {
    e.stopPropagation();
    if (type === "track") toggleLikeTrack(refId);
    if (type === "set") toggleLikeSet(refId);
  };

  const handleShare = async (e: MouseEvent) => {
    e.stopPropagation();
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      await navigator.share({ title: label, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handlePlaylist = (e: MouseEvent) => {
    e.stopPropagation();
    openAddToPlaylist({ type, refId, label });
  };

  const playLabel = type === "set" ? "Watch" : playing ? "Pause" : "Play";
  const playAria = type === "set" ? "Watch set" : playing ? "Pause" : "Play";

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            handlePlay(e as unknown as MouseEvent);
          }}
          className="touch-manipulation"
          aria-label={playAria}
        >
          {type === "set" ? <Play className="h-4 w-4" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={handlePlaylist} aria-label="Save to playlist">
          <ListPlus className="h-4 w-4" />
        </Button>
        {(type === "track" || type === "set") && (
          <Button size="sm" variant="ghost" onClick={handleLike} aria-label="Like">
            <Heart className={`h-4 w-4 ${liked ? "fill-accent text-accent" : ""}`} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        className="touch-manipulation"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          handlePlay(e as unknown as MouseEvent);
        }}
      >
        {playLabel}
      </Button>
      <Button size="sm" variant="outline" onClick={handlePlaylist}>
        Save to playlist
      </Button>
      {(type === "track" || type === "set") && (
        <Button size="sm" variant="outline" onClick={handleLike}>
          {liked ? "Liked" : "Like"}
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={handleShare} aria-label="Share">
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
