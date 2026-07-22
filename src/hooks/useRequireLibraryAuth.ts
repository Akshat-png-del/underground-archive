"use client";

import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSignInModal } from "@/components/auth/SignInModal";

/**
 * Gate Library mutations behind the existing Sign In flow when Firebase auth is available.
 * When auth is not configured, local library actions remain available.
 */
export function useRequireLibraryAuth() {
  const { available, ready, user } = useAuth();
  const { openSignIn } = useSignInModal();

  return useCallback(
    (action?: () => void): boolean => {
      if (available && ready && !user) {
        openSignIn();
        return false;
      }
      action?.();
      return true;
    },
    [available, ready, user, openSignIn],
  );
}
