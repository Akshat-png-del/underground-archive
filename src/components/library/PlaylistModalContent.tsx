"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import type { LibraryItemType } from "@/types/library";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  pending: { type: LibraryItemType; refId: string; label: string } | null;
  createOnly: boolean;
  onClose: () => void;
}

export function PlaylistModal({ pending, createOnly, onClose }: Props) {
  const router = useRouter();
  const { playlists, createPlaylist, addToPlaylist } = useLibrary();
  const [showCreate, setShowCreate] = useState(createOnly || playlists.length === 0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const handleCreate = () => {
    if (!title.trim()) return;
    const p = createPlaylist({ title: title.trim(), description, isPublic });
    if (pending) addToPlaylist(p.id, pending.type, pending.refId);
    onClose();
    router.push(`/playlists/${p.id}`);
  };

  const handleAdd = (playlistId: string) => {
    if (!pending) return;
    addToPlaylist(playlistId, pending.type, pending.refId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 sm:items-center" role="dialog">
      <div className="w-full max-w-md border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-foreground">
            {showCreate ? "New playlist" : "Save to playlist"}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>

        {pending && !showCreate && (
          <p className="mt-2 text-sm text-muted">Adding: {pending.label}</p>
        )}

        {showCreate ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm text-muted">Name</label>
              <Input
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Hard Techno Essentials"
              />
            </div>
            <div>
              <label className="text-sm text-muted">Description</label>
              <textarea
                className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Warehouse energy for 4am..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-light">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Public playlist
            </label>
            <Button className="w-full" onClick={handleCreate} disabled={!title.trim()}>
              {pending ? "Create & add" : "Create playlist"}
            </Button>
            {!createOnly && playlists.length > 0 && (
              <button type="button" className="text-sm text-muted hover:text-foreground" onClick={() => setShowCreate(false)}>
                ← Back to playlists
              </button>
            )}
          </div>
        ) : (
          <>
            <ul className="mt-6 max-h-64 space-y-2 overflow-y-auto">
              {playlists.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between border border-border px-4 py-3 text-left text-sm hover:border-accent"
                    onClick={() => handleAdd(p.id)}
                  >
                    <span className="font-medium text-foreground">{p.title}</span>
                    <span className="text-muted">{p.items.length} items</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 text-sm text-accent hover:underline"
              onClick={() => setShowCreate(true)}
            >
              + Create new playlist
            </button>
          </>
        )}
      </div>
    </div>
  );
}
