"use client";

import { useEffect, useState } from "react";

/** True after the client has mounted — use to gate browser-only or time-rotated UI. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
