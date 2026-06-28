export function weekIndex(seed = 0): number {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return week + seed;
}

/** Rotates every 12 hours for set-of-day and daily discovery. */
export function halfDayIndex(seed = 0): number {
  const halfDays = Math.floor(Date.now() / (12 * 60 * 60 * 1000));
  return halfDays + seed;
}

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

export { pick };
