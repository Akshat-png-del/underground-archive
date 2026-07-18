export function weekIndex(seed = 0): number {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return week + seed;
}

/** Rotates every 12 hours for legacy daily discovery helpers. */
export function halfDayIndex(seed = 0): number {
  const halfDays = Math.floor(Date.now() / (12 * 60 * 60 * 1000));
  return halfDays + seed;
}

/** Homepage editorial rotation — new exposure budget every 5 minutes. */
export const HOMEPAGE_ROTATION_MS = 5 * 60 * 1000;

export function fiveMinuteIndex(seed = 0): number {
  return Math.floor(Date.now() / HOMEPAGE_ROTATION_MS) + seed;
}

/** Per page load (client) — legacy helpers. SSR returns seed. Prefer fiveMinuteIndex for homepage. */
let clientPageLoadSeed: number | null = null;

export function pageLoadIndex(seed = 0): number {
  if (typeof window !== "undefined") {
    if (clientPageLoadSeed === null) {
      clientPageLoadSeed = Math.floor(Math.random() * 997);
    }
    return clientPageLoadSeed + seed;
  }
  return seed;
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

export { pick };
