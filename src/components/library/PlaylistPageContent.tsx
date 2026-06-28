"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  getPlaylistById,
  isSeedPlaylist,
} from "@/lib/library/store";
import {
  resolvePlaylistItem,
  useLibrary,
} from "@/context/LibraryContext";
import { parseDuration, formatTotalDuration } from "@/lib/music";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/Button";
import { MusicActions } from "@/components/music/MusicActions";

interface Props {
  playlistId: string;
}

export function PlaylistPageContent({ playlistId }: Props) {
  const {
    playlists,
    updatePlaylist,
    deletePlaylist,
    removeFromPlaylist,
    reorderPlaylistItems,
    copyPlaylist,
    toggleLikePlaylist,
    isPlaylistLiked,
    profile,
  } = useLibrary();

  const playlist = useMemo(
    () => getPlaylistById(playlistId, playlists),
    [playlistId, playlists]
  );

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(playlist?.title ?? "");
  const [description, setDescription] = useState(playlist?.description ?? "");
  const [dragId, setDragId] = useState<string | null>(null);

  if (!playlist) {
    return <p className="text-muted">Playlist not found.</p>;
  }

  const isOwner = playlist.creatorId === profile.id && !isSeedPlaylist(playlist.id);
  const resolved = playlist.items
    .sort((a, b) => a.order - b.order)
    .map(resolvePlaylistItem)
    .filter((i): i is NonNullable<typeof i> => !!i);

  const totalSeconds = resolved.reduce((sum, item) => sum + parseDuration(item.duration), 0);
  const liked = isPlaylistLiked(playlist.id);

  const saveEdit = () => {
    if (!isOwner) return;
    updatePlaylist(playlist.id, { title, description });
    setEditing(false);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || !isOwner || dragId === targetId) return;
    const ids = resolved.map((r) => r.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderPlaylistItems(playlist.id, next);
    setDragId(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="relative h-48 w-48 shrink-0 border border-border">
          <SafeImage src={playlist.coverImage} alt="" fill sizes="192px" />
        </div>
        <div className="flex-1">
          {editing ? (
            <div className="space-y-3">
              <input
                className="w-full border border-border bg-background px-3 py-2 font-serif text-2xl text-foreground"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted">
                {playlist.isPublic ? "Public playlist" : "Private playlist"} · by {playlist.creatorName}
              </p>
              <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">{playlist.title}</h1>
              {playlist.description && (
                <p className="mt-3 text-muted-light">{playlist.description}</p>
              )}
              <p className="mt-4 text-sm text-muted">
                {resolved.length} tracks · {formatTotalDuration(totalSeconds)} · {playlist.likeCount + (liked ? 1 : 0)} likes
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toggleLikePlaylist(playlist.id)}>
              {liked ? "Liked" : "Like"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const copy = copyPlaylist(playlist.id);
                if (copy) window.location.href = `/playlists/${copy.id}`;
              }}
            >
              Copy playlist
            </Button>
            {isOwner && !editing && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Delete this playlist?")) {
                      deletePlaylist(playlist.id);
                      window.location.href = "/library/playlists";
                    }
                  }}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-serif text-xl text-foreground">Tracks</h2>
        {resolved.length === 0 ? (
          <p className="mt-4 text-muted">No items yet. Save tracks or sets from artist pages.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {resolved.map((item, i) => (
              <li
                key={item.id}
                draggable={isOwner}
                onDragStart={() => setDragId(item.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(item.id)}
                className={`flex items-center gap-4 border border-border p-3 ${dragId === item.id ? "opacity-50" : ""}`}
              >
                <span className="w-6 text-sm text-muted">{i + 1}</span>
                {isOwner && <span className="cursor-grab text-muted">⋮⋮</span>}
                <div className="relative h-12 w-12 shrink-0">
                  <SafeImage src={item.coverArt} alt="" fill sizes="48px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{item.title}</p>
                  <Link href={`/artists/${item.artistSlug}`} className="text-xs text-muted hover:text-accent">
                    {item.artist} · {item.duration}
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <MusicActions
                    type={item.type === "release" ? "release" : item.type}
                    refId={item.refId}
                    label={`${item.title} — ${item.artist}`}
                    spotifyUrl={"spotifyUrl" in item ? item.spotifyUrl : undefined}
                    youtubeId={"youtubeId" in item ? item.youtubeId : undefined}
                    compact
                  />
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromPlaylist(playlist.id, item.id)}
                    >
                      Remove
                    </Button>
                  )}
                  {"spotifyUrl" in item && item.spotifyUrl && (
                    <a href={item.spotifyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline hidden sm:inline">
                      Spotify
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
