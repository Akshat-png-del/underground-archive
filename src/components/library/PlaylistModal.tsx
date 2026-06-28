"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { LibraryItemType } from "@/types/library";
import { PlaylistModal } from "./PlaylistModalContent";

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
  const [pending, setPending] = useState<PendingAdd | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const openAddToPlaylist = useCallback((p: PendingAdd) => {
    setCreateOpen(false);
    setPending(p);
  }, []);

  const openCreatePlaylist = useCallback(() => {
    setPending(null);
    setCreateOpen(true);
  }, []);

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
