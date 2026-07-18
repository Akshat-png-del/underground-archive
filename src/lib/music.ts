/** Parse "5:42" or "1:02:30" into total seconds. Returns 0 for missing/invalid. */
export function parseDuration(duration: string | undefined | null): number {
  if (!duration) return 0;
  const parts = duration.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

export function formatTotalDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function slugify(...parts: string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function trackId(artistSlug: string, title: string): string {
  return `${artistSlug}::${slugify(title)}`;
}

export function releaseId(artistSlug: string, title: string, type: string): string {
  return `${artistSlug}::${type}::${slugify(title)}`;
}

export function setId(artistSlug: string, title: string): string {
  return `${artistSlug}::${slugify(title)}`;
}

export function extractSpotifyEmbedUrl(url: string): string | null {
  const match = url.match(/spotify\.com\/(track|album|artist|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator`;
}

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const watch = url.match(/[?&]v=([^&]+)/);
  if (watch) return watch[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
