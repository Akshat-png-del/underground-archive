"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { usePlaylistModal } from "@/components/library/PlaylistModal";
import { HistoryPlayRow } from "@/components/music/HistoryPlayRow";
import { LibraryArtwork } from "@/components/library/LibraryArtwork";
import {
  hydrateHistoryEntry,
  hydrateRecentlyViewedEntry,
} from "@/lib/library/resolve-display";
import { playbackItemFromRef } from "@/lib/music/playback";

export function LibraryProfile() {
  const { ready, history, playlists, recentlyViewed } = useLibrary();
  const {
    available: authAvailable,
    ready: authReady,
    user,
    signInWithGoogle,
  } = useAuth();
  const { openCreatePlaylist } = usePlaylistModal();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const viewed = useMemo(
    () =>
      recentlyViewed
        .map(hydrateRecentlyViewedEntry)
        .filter((v): v is NonNullable<typeof v> => !!v)
        .slice(0, 8),
    [recentlyViewed],
  );
  const continueListening = useMemo(
    () =>
      history
        .map(hydrateHistoryEntry)
        .filter((h): h is NonNullable<typeof h> => !!h)
        .slice(0, 5),
    [history],
  );
  const continueBrowseQueue = useMemo(
    () =>
      continueListening
        .map((h) => playbackItemFromRef(h.type, h.refId))
        .filter((item): item is NonNullable<typeof item> => !!item),
    [continueListening],
  );
  if (!ready) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-foreground">Your Library</h1>
        <p className="mt-3 text-sm text-muted" role="status">Loading your library…</p>
      </div>
    );
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch {
      setAuthError("Sign in failed. Try again.");
    } finally {
      setSigningIn(false);
    }
  };

  const userLabel = user?.displayName?.trim() || user?.email || "";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Your Library</h1>
          <p className="mt-2 text-muted-light">Playlists, saved music, and recent listening.</p>
        </div>
        <Button size="sm" onClick={openCreatePlaylist}>Create playlist</Button>
      </div>

      {authAvailable && authReady && !user ? (
        <section className="mt-8 flex flex-col gap-5 rounded-sm border border-border/70 bg-surface/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl text-foreground">Keep your library with you</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-light">
              Sign in to access your profile and keep your account available across sessions.
            </p>
          </div>
          <div className="shrink-0">
            <Button
              size="sm"
              variant="secondary"
              disabled={signingIn}
              onClick={() => void handleSignIn()}
            >
              {signingIn ? "Signing in…" : "Sign in with Google"}
            </Button>
            {authError ? <p className="mt-2 text-xs text-muted" role="alert">{authError}</p> : null}
          </div>
        </section>
      ) : null}

      {authAvailable && authReady && user ? (
        <section className="mt-8 rounded-sm border border-border/70 p-5" aria-label="Profile">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{userLabel}</p>
            {user.email && user.email !== userLabel ? (
              <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted">Signed in with Google</p>
          </div>
        </section>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/60 pb-7 text-sm text-muted">
        <span><strong className="font-medium text-foreground">{playlists.length}</strong> playlists</span>
        <span><strong className="font-medium text-foreground">{history.length}</strong> recent plays</span>
        <Link
          href="/library/history"
          className="text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          View history
        </Link>
      </div>

      {viewed.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl text-foreground">Recently viewed</h2>
          <ul className="mt-4 divide-y divide-border/60">
            {viewed.map((v) => (
              <li key={v.id}>
                <Link
                  href={v.href}
                  className="flex items-center gap-3 rounded-sm px-2 py-3 transition-colors hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <div className="relative h-10 w-10 shrink-0">
                    <LibraryArtwork src={v.coverArt} alt="" fill sizes="40px" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.title}</p>
                    {v.subtitle ? <p className="text-xs text-muted">{v.subtitle}</p> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {continueListening.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl text-foreground">Continue listening</h2>
          <ul className="mt-4 divide-y divide-border/60">
            {continueListening.map((h, i) => (
              <li key={h.id}>
                <HistoryPlayRow entry={h} browseQueue={continueBrowseQueue} browseIndex={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
