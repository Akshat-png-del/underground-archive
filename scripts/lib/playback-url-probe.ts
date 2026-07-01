/**
 * Live URL probes for playback catalog audits.
 * Uses public oEmbed endpoints — no API keys required.
 */
import { sleep } from "../../src/lib/ingestion/http";

const UA = "Vitalforge/1.0 (playback-audit)";

export interface ProbeResult {
  ok: boolean;
  reason: string | null;
  status?: number;
}

export async function probeYoutubeId(videoId: string): Promise<ProbeResult> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}&format=json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (res.ok) return { ok: true, reason: null, status: res.status };
    if (res.status === 404) {
      return { ok: false, reason: "YouTube video not found (404)", status: res.status };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "YouTube video private or restricted", status: res.status };
    }
    return { ok: false, reason: `YouTube oEmbed HTTP ${res.status}`, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `YouTube probe failed: ${message}` };
  }
}

export async function probeSpotifyTrackId(trackId: string): Promise<ProbeResult> {
  try {
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(
      `https://open.spotify.com/track/${trackId}`,
    )}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (res.ok) return { ok: true, reason: null, status: res.status };
    if (res.status === 404) {
      return { ok: false, reason: "Spotify track not found (404)", status: res.status };
    }
    return { ok: false, reason: `Spotify oEmbed HTTP ${res.status}`, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `Spotify probe failed: ${message}` };
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  delayMs: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
      if (delayMs > 0 && i < items.length - 1) await sleep(delayMs);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
