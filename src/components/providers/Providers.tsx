"use client";

import { PreferencesProvider } from "@/context/PreferencesContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { PlaylistModalProvider } from "@/components/library/PlaylistModal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LibraryProvider>
      <PreferencesProvider>
        <PlaylistModalProvider>
          {children}
        </PlaylistModalProvider>
      </PreferencesProvider>
    </LibraryProvider>
  );
}
