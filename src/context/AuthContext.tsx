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
  onAuthStateChanged,
  signInWithPopup,
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
        setUser(
          next
            ? {
                uid: next.uid,
                displayName: next.displayName,
                email: next.email,
                photoURL: next.photoURL,
              }
            : null,
        );
        setReady(true);
      };

      unsubscribe = onAuthStateChanged(auth, settle);
      readyFallback = setTimeout(() => settle(auth.currentUser), 1500);
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
    if (!available) return;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(getFirebaseAuth(), provider);
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
