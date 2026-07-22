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
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthContextValue {
  available: boolean;
  ready: boolean;
  user: AuthUser | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(next: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
} | null): AuthUser | null {
  if (!next) return null;
  return {
    uid: next.uid,
    displayName: next.displayName,
    email: next.email,
    photoURL: next.photoURL,
  };
}

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function shouldFallbackToRedirect(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return (
    code === "auth/popup-blocked" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/internal-error"
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const available = isFirebaseConfigured();
  const [ready, setReady] = useState(!available);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!available) return;

    let unsubscribe = () => {};
    let readyFallback: ReturnType<typeof setTimeout> | undefined;
    try {
      const auth = getFirebaseAuth();
      const settle = (next: typeof auth.currentUser) => {
        if (readyFallback) clearTimeout(readyFallback);
        setUser(toAuthUser(next));
        setReady(true);
      };

      void getRedirectResult(auth)
        .then((result) => {
          if (result?.user) settle(result.user);
        })
        .catch(() => {
          // Redirect result can fail after a cancelled flow; auth state listener still settles.
        });

      unsubscribe = onAuthStateChanged(auth, settle);
      readyFallback = setTimeout(() => settle(auth.currentUser), 400);
    } catch {
      readyFallback = setTimeout(() => {
        setUser(null);
        setReady(true);
      }, 0);
    }

    return () => {
      if (readyFallback) clearTimeout(readyFallback);
      unsubscribe();
    };
  }, [available]);

  const signInWithGoogle = useCallback(async () => {
    if (!available) {
      throw new Error("Sign in is unavailable. Firebase is not configured.");
    }
    const auth = getFirebaseAuth();
    const provider = createGoogleProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      // User closed the popup — surface as cancellation, do not redirect.
      if (code === "auth/popup-closed-by-user") throw error;
      if (shouldFallbackToRedirect(error)) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw error;
    }
  }, [available]);

  const signOut = useCallback(async () => {
    if (!available) return;
    await firebaseSignOut(getFirebaseAuth());
  }, [available]);

  const value = useMemo(
    () => ({ available, ready, user, signInWithGoogle, signOut }),
    [available, ready, user, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
