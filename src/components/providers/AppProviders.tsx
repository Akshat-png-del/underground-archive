"use client";

import { Providers } from "./Providers";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
