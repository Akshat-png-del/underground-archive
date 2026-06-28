import { MUSICBRAINZ_USER_AGENT } from "./config";

export class IngestionHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string
  ) {
    super(message);
    this.name = "IngestionHttpError";
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { provider?: "musicbrainz" | "discogs" | "spotify" | "youtube" }
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.provider === "musicbrainz") {
    headers.set("User-Agent", MUSICBRAINZ_USER_AGENT);
    headers.set("Accept", "application/json");
  }

  if (init?.provider === "discogs") {
    headers.set("User-Agent", MUSICBRAINZ_USER_AGENT);
    headers.set("Accept", "application/json");
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new IngestionHttpError(
      `HTTP ${res.status}: ${body.slice(0, 200)}`,
      res.status,
      url
    );
  }

  return res.json() as Promise<T>;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
