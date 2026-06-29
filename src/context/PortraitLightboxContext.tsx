"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  PortraitLightbox,
  type PortraitLightboxData,
} from "@/components/artists/PortraitLightbox";

interface PortraitLightboxContextValue {
  openPortrait: (portrait: PortraitLightboxData) => void;
  closePortrait: () => void;
}

const PortraitLightboxContext = createContext<PortraitLightboxContextValue | null>(null);

export function PortraitLightboxProvider({ children }: { children: ReactNode }) {
  const [portrait, setPortrait] = useState<PortraitLightboxData | null>(null);

  const openPortrait = useCallback((next: PortraitLightboxData) => {
    setPortrait(next);
  }, []);

  const closePortrait = useCallback(() => {
    setPortrait(null);
  }, []);

  const value = useMemo(
    () => ({ openPortrait, closePortrait }),
    [openPortrait, closePortrait],
  );

  return (
    <PortraitLightboxContext.Provider value={value}>
      {children}
      {portrait && <PortraitLightbox portrait={portrait} onClose={closePortrait} />}
    </PortraitLightboxContext.Provider>
  );
}

export function usePortraitLightbox() {
  const ctx = useContext(PortraitLightboxContext);
  if (!ctx) {
    throw new Error("usePortraitLightbox must be used within PortraitLightboxProvider");
  }
  return ctx;
}
