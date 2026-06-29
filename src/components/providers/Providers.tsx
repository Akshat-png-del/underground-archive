"use client";

import { PreferencesProvider } from "@/context/PreferencesContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { PlaylistModalProvider } from "@/components/library/PlaylistModal";
import { PortraitLightboxProvider } from "@/context/PortraitLightboxContext";
import { PlaybackLibraryBridge } from "@/components/music/PlaybackLibraryBridge";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LibraryProvider>
      <PlaybackLibraryBridge />
      <PreferencesProvider>
        <PlaylistModalProvider>
          <PortraitLightboxProvider>{children}</PortraitLightboxProvider>
        </PlaylistModalProvider>
      </PreferencesProvider>
    </LibraryProvider>
  );
}
