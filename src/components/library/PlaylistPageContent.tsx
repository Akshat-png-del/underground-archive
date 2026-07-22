"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getPlaylistById,
  isSeedPlaylist,
} from "@/lib/library/store";
import {
  resolvePlaylistItem,
  useLibrary,
} from "@/context/LibraryContext";
import { useAuth } from "@/context/AuthContext";
import { LibraryArtwork } from "@/components/library/LibraryArtwork";
import { PlaylistCover } from "@/components/library/PlaylistCover";
import { Button } from "@/components/ui/Button";
import { MusicActions } from "@/components/music/MusicActions";
import { TrackRow } from "@/components/music/TrackRow";
import { SetRow } from "@/components/music/SetRow";
import { playbackItemFromRef, browseContextAt, type PlaybackItem } from "@/lib/music/playback";
import { useCardPlayback, playbackItemActive, playbackItemPlaying } from "@/lib/music/use-card-playback";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";
import { resolveSetWatchSlug } from "@/lib/sets/set-watch-navigation";
import { catalogTracks } from "@/content/tracks";
import { archiveSets } from "@/content/sets";
import { getArtist } from "@/content/artists";
import { useRequireLibraryAuth } from "@/hooks/useRequireLibraryAuth";

const HARD_TECHNO_TRACKS = catalogTracks
  .filter((track) => getArtist(track.artistSlug)?.genres.includes("hard-techno"))
  .slice(0, 4);

const HARD_TECHNO_SETS = archiveSets
  .filter((set) => set.genres.includes("hard-techno"))
  .slice(0, 3);

interface Props {
  playlistId: string;
}

function PlaylistItemRow({
  item,
  index,
  browseQueue,
  isOwner,
  playlistId,
  dragId,
  setDragId,
  onDrop,
  removeFromPlaylist,
}: {
  item: NonNullable<ReturnType<typeof resolvePlaylistItem>>;
  index: number;
  browseQueue: PlaybackItem[];
  isOwner: boolean;
  playlistId: string;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onDrop: (targetId: string) => void;
  removeFromPlaylist: (playlistId: string, itemId: string) => void;
}) {
  const playbackType = item.type === "release" ? "release" : item.type;
  const playbackItem = playbackItemFromRef(playbackType, item.refId);
  const browse = playbackItem ? browseContextAt(browseQueue, playbackItem, index) : undefined;
  const setSlug =
    playbackType === "set" ? resolveSetWatchSlug(item.refId) ?? undefined : undefined;
  const snapshot = useFinalPlaybackSnapshot();
  const active = playbackItemActive(snapshot, playbackType, item.refId);
  const playing = playbackItemPlaying(snapshot, playbackType, item.refId);
  const { handleCardPointerDown, stopCardPointerDown } = useCardPlayback(
    playbackItem ?? {
      type: playbackType,
      refId: item.refId,
      label: `${item.title} — ${item.artist}`,
      title: item.title,
      subtitle: item.artist,
    },
    playbackType,
    item.refId,
    browse,
    setSlug,
  );
  const requireAuth = useRequireLibraryAuth();

  return (
    <li
      draggable={isOwner}
      onDragStart={() => setDragId(item.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(item.id)}
      onPointerDown={(e) => {
        if (!playbackItem) return;
        handleCardPointerDown(e);
      }}
      className={`flex w-full min-w-0 max-w-full cursor-pointer touch-manipulation items-center gap-3 rounded-sm px-2 py-3 transition-colors sm:gap-4 sm:px-3 ${
        active ? "bg-surface" : "hover:bg-surface/60"
      } ${dragId === item.id ? "opacity-50" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${item.title}` : `Play ${item.title}`}
    >
      <span className="w-6 text-sm text-muted">{index + 1}</span>
      {isOwner && <span className="cursor-grab text-muted">⋮⋮</span>}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden">
        <LibraryArtwork src={item.coverArt} alt="" fill sizes="48px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{item.title}</p>
        <Link
          href={`/artists/${item.artistSlug}`}
          className="text-xs text-muted hover:text-accent"
          onPointerDown={stopCardPointerDown}
        >
          {item.artist}
          {item.duration ? ` · ${item.duration}` : ""}
        </Link>
      </div>
      <div className="flex items-center gap-2" onPointerDown={stopCardPointerDown}>
        <MusicActions
          type={playbackType}
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
            onClick={() => {
              if (!requireAuth()) return;
              removeFromPlaylist(playlistId, item.id);
            }}
            aria-label={`Remove ${item.title} from playlist`}
          >
            Remove
          </Button>
        )}
      </div>
    </li>
  );
}

export function PlaylistPageContent({ playlistId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const requireAuth = useRequireLibraryAuth();
  const {
    playlists,
    updatePlaylist,
    deletePlaylist,
    removeFromPlaylist,
    reorderPlaylistItems,
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

  const resolved = useMemo(
    () =>
      (playlist?.items ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        // Seed playlists are Spotify audio tracks only — never surface set/video rows.
        .filter((item) => !(isSeedPlaylist(playlistId) && item.type !== "track"))
        .map(resolvePlaylistItem)
        .filter((i): i is NonNullable<typeof i> => !!i),
    [playlist?.items, playlistId],
  );

  const browseQueue = useMemo(
    () =>
      resolved
        .map((row) => playbackItemFromRef(row.type === "release" ? "release" : row.type, row.refId))
        .filter((item): item is PlaybackItem => !!item),
    [resolved],
  );

  if (!playlist) {
    return <p className="text-muted">Playlist not found.</p>;
  }

  const isOwner =
    !isSeedPlaylist(playlist.id) &&
    (playlist.creatorId === profile.id || playlist.creatorId === user?.uid);
  const creatorLabel =
    isOwner && user
      ? user.displayName?.trim() || user.email || playlist.creatorName
      : playlist.creatorName;

  const saveEdit = () => {
    if (!isOwner) return;
    if (!requireAuth()) return;
    updatePlaylist(playlist.id, { title, description });
    setEditing(false);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || !isOwner || dragId === targetId) return;
    if (!requireAuth()) return;
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
        <div className="relative h-48 w-48 shrink-0 overflow-hidden border border-border">
          <PlaylistCover playlist={playlist} fill sizes="192px" className="object-cover" />
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
                {playlist.isPublic ? "Public playlist" : "Private playlist"} · by {creatorLabel}
                {playlist.likeCount > 0 ? ` · ${playlist.likeCount} likes` : ""}
              </p>
              <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">{playlist.title}</h1>
              {playlist.description && (
                <p className="mt-3 text-muted-light">{playlist.description}</p>
              )}
              <p className="mt-2 font-mono text-xs text-muted-light">
                {resolved.length} tracks
              </p>
            </>
          )}

          {isOwner && !editing && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!requireAuth()) return;
                  setEditing(true);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!requireAuth()) return;
                  if (confirm("Delete this playlist?")) {
                    deletePlaylist(playlist.id);
                    router.push("/library/playlists");
                  }
                }}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-serif text-xl text-foreground">Tracks</h2>
        {resolved.length === 0 ? (
          <>
            <div className="mt-6 rounded-sm border border-dashed border-border px-6 py-10 text-center">
              <p className="text-foreground">This playlist is empty</p>
              <p className="mt-1 text-sm text-muted">Add Spotify tracks while browsing the library.</p>
            </div>
            <section className="mt-10">
              <h3 className="font-serif text-lg text-foreground">Suggested tracks</h3>
              <ol className="mt-4 divide-y divide-border/60">
                {HARD_TECHNO_TRACKS.map((track, index) => (
                  <TrackRow key={track.id} track={track} index={index} />
                ))}
              </ol>
            </section>
            <section className="mt-10">
              <h3 className="font-serif text-lg text-foreground">Suggested sets</h3>
              <div className="mt-4 divide-y divide-border/60">
                {HARD_TECHNO_SETS.map((set) => (
                  <SetRow key={set.id} set={set} />
                ))}
              </div>
            </section>
          </>
        ) : (
          <ul className="mt-6 divide-y divide-border/60">
            {resolved.map((item, i) => (
              <PlaylistItemRow
                key={item.id}
                item={item}
                index={i}
                browseQueue={browseQueue}
                isOwner={isOwner}
                playlistId={playlist.id}
                dragId={dragId}
                setDragId={setDragId}
                onDrop={onDrop}
                removeFromPlaylist={removeFromPlaylist}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
