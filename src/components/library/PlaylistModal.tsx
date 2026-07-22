"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { LibraryItemType } from "@/types/library";
import { PlaylistModal } from "./PlaylistModalContent";
import { useRequireLibraryAuth } from "@/hooks/useRequireLibraryAuth";

interface PendingAdd {
  type: LibraryItemType;
  refId: string;
  label: string;
}

interface PlaylistModalContextValue {
  openAddToPlaylist: (pending: PendingAdd) => void;
  openCreatePlaylist: () => void;
}

const PlaylistModalContext = createContext<PlaylistModalContextValue | null>(null);

export function PlaylistModalProvider({ children }: { children: ReactNode }) {
  const requireAuth = useRequireLibraryAuth();
  const [pending, setPending] = useState<PendingAdd | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const openAddToPlaylist = useCallback(
    (p: PendingAdd) => {
      // Playlists are Spotify audio only — never mix Sets into playlists.
      if (p.type === "set") return;
      if (!requireAuth()) return;
      setCreateOpen(false);
      setPending(p);
    },
    [requireAuth],
  );

  const openCreatePlaylist = useCallback(() => {
    if (!requireAuth()) return;
    setPending(null);
    setCreateOpen(true);
  }, [requireAuth]);

  const close = () => {
    setPending(null);
    setCreateOpen(false);
  };

  return (
    <PlaylistModalContext.Provider value={{ openAddToPlaylist, openCreatePlaylist }}>
      {children}
      {(pending || createOpen) && (
        <PlaylistModal pending={pending} createOnly={createOpen} onClose={close} />
      )}
    </PlaylistModalContext.Provider>
  );
}

export function usePlaylistModal() {
  const ctx = useContext(PlaylistModalContext);
  if (!ctx) throw new Error("usePlaylistModal must be used within PlaylistModalProvider");
  return ctx;
}
