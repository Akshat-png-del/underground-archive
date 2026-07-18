"use client";

import { useEffect, useState } from "react";
import { HOMEPAGE_ROTATION_MS } from "@/content/home/rotation";

/**
 * Refresh homepage editorial content when the 5-minute exposure window advances.
 */
export function useHomepageRotationRefresh<T>(load: () => T, initial: T): T {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const refresh = () => setValue(load());
    refresh();

    const msIntoWindow = Date.now() % HOMEPAGE_ROTATION_MS;
    const toNext = HOMEPAGE_ROTATION_MS - msIntoWindow + 100;
    const timeout = window.setTimeout(() => {
      refresh();
    }, toNext);
    const interval = window.setInterval(refresh, HOMEPAGE_ROTATION_MS);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
    // load is a stable module-level getter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}
