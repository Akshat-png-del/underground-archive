"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

interface SignInModalContextValue {
  openSignIn: () => void;
  closeSignIn: () => void;
}

const SignInModalContext = createContext<SignInModalContextValue | null>(null);

function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  const message = (err as { message?: string })?.message;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Sign in was cancelled. Try again.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup was blocked. Redirecting to complete sign in…";
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized for sign in. Add it in Firebase Auth settings.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled for this project.";
  }
  if (message?.trim()) return message.trim();
  return "Sign in failed. Try again.";
}

function SignInModalDialog({ onClose }: { onClose: () => void }) {
  const { available, signInWithGoogle, user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) onClose();
  }, [user, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pending]);

  const handleSignIn = async () => {
    if (!available) return;
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-background/80 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-in-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Dismiss sign in"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose();
        }}
      />
      <div className="relative w-full max-w-md border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <h2 id="sign-in-title" className="font-serif text-xl text-foreground">
            Sign in
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="interactive-ghost text-muted disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 text-sm text-muted-light">
          Sign in to access your library, playlists, and listening history across sessions.
        </p>
        <div className="mt-6 space-y-3">
          <Button className="w-full" disabled={pending || !available} onClick={() => void handleSignIn()}>
            {pending ? "Signing in…" : "Sign In"}
          </Button>
          <Button className="w-full" variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          {!available ? (
            <p className="text-xs text-muted" role="alert">
              Sign in is unavailable. Firebase is not configured.
            </p>
          ) : null}
          {error ? (
            <p className="text-xs text-muted" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SignInModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSignIn = useCallback(() => setOpen(true), []);
  const closeSignIn = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openSignIn, closeSignIn }), [openSignIn, closeSignIn]);

  return (
    <SignInModalContext.Provider value={value}>
      {children}
      {open ? <SignInModalDialog onClose={closeSignIn} /> : null}
    </SignInModalContext.Provider>
  );
}

export function useSignInModal(): SignInModalContextValue {
  const context = useContext(SignInModalContext);
  if (!context) {
    throw new Error("useSignInModal must be used within SignInModalProvider");
  }
  return context;
}
