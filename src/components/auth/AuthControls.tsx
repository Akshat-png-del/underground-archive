"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ACCOUNT_LINKS = [
  { href: "/library", label: "Library" },
  { href: "/library/playlists", label: "Playlists" },
  { href: "/library/history", label: "Recently played" },
] as const;

export function AuthControls({ onNavigate }: { onNavigate?: () => void }) {
  const { available, ready, user, signInWithGoogle, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [close, open]);

  if (!available) return null;
  if (!ready) {
    return <span className="h-8 w-20 animate-pulse rounded-sm bg-surface" aria-label="Loading account" />;
  }

  const handleSignIn = async () => {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Sign in failed. Try again.");
    } finally {
      setPending(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    close();
    try {
      await signOut();
    } catch {
      setError("Sign out failed. Try again.");
    }
  };

  if (!user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={pending}
          className="rounded-sm px-2 py-1.5 text-sm text-muted-light transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in with Google"}
        </button>
        {error ? (
          <p className="absolute right-0 top-full z-50 mt-2 whitespace-nowrap text-xs text-muted" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const label = user.displayName?.trim() || user.email || "Account";

  return (
    <div className="relative" ref={rootRef}>
      <button
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${label}`}
        onClick={() => setOpen((value) => !value)}
        className="max-w-44 rounded-sm px-2 py-1.5 text-sm text-muted-light transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <span className="truncate">{label}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className="absolute right-0 z-50 mt-2 min-w-56 rounded-sm border border-border bg-background p-2 shadow-xl"
        >
          <div className="border-b border-border/70 px-2 pb-3 pt-1">
            <p className="truncate text-sm font-medium text-foreground">{label}</p>
            {user.email && user.email !== label ? (
              <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
            ) : null}
          </div>
          <div className="py-1">
            {ACCOUNT_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="block rounded-sm px-2 py-2 text-sm text-muted-light transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                onClick={() => {
                  close();
                  onNavigate?.();
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-2 rounded-sm border-t border-border/70 px-2 py-2.5 text-left text-sm text-muted-light transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="absolute right-0 top-full z-50 mt-2 whitespace-nowrap text-xs text-muted" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
