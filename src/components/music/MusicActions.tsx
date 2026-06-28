"use client";

import { useState } from "react";
import { Heart, ListPlus, Play, Share2 } from "lucide-react";
import type { LibraryItemType } from "@/types/library";
import { useLibrary } from "@/context/LibraryContext";
import { usePlaylistModal } from "@/components/library/PlaylistModal";
import { Button } from "@/components/ui/Button";
import { PlayerModal } from "@/components/music/PlayerModal";

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
  const { openAddToPlaylist } = usePlaylistModal();
  const { recordPlay, toggleLikeTrack, toggleLikeSet, isTrackLiked, isSetLiked } = useLibrary();
  const [playerOpen, setPlayerOpen] = useState(false);

  const liked = type === "track" ? isTrackLiked(refId) : type === "set" ? isSetLiked(refId) : false;

  const handlePlay = () => {
    recordPlay(type, refId);
    setPlayerOpen(true);
  };

  const handleLike = () => {
    if (type === "track") toggleLikeTrack(refId);
    if (type === "set") toggleLikeSet(refId);
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      await navigator.share({ title: label, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (compact) {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={handlePlay} aria-label="Play">
            <Play className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openAddToPlaylist({ type, refId, label })}
            aria-label="Save to playlist"
          >
            <ListPlus className="h-4 w-4" />
          </Button>
          {(type === "track" || type === "set") && (
            <Button size="sm" variant="ghost" onClick={handleLike} aria-label="Like">
              <Heart className={`h-4 w-4 ${liked ? "fill-accent text-accent" : ""}`} />
            </Button>
          )}
        </div>
        {playerOpen && (
          <PlayerModal
            title={label}
            spotifyUrl={spotifyUrl}
            youtubeUrl={youtubeUrl}
            youtubeId={youtubeId}
            onClose={() => setPlayerOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handlePlay}>
          Play
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openAddToPlaylist({ type, refId, label })}
        >
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
      {playerOpen && (
        <PlayerModal
          title={label}
          spotifyUrl={spotifyUrl}
          youtubeUrl={youtubeUrl}
          youtubeId={youtubeId}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </>
  );
}
