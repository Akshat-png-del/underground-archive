import { fetchJson } from "./http";
import { getSpotifyCredentials } from "./config";
import type { SpotifyIngested } from "./types";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtistResponse {
  id: string;
  name: string;
  genres: string[];
  followers: { total: number };
  popularity: number;
  images: { url: string; height: number | null; width: number | null }[];
  external_urls: { spotify: string };
}

interface SpotifyRelatedResponse {
  artists: SpotifyArtistResponse[];
}

interface SpotifySearchResponse {
  artists: { items: SpotifyArtistResponse[] };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const creds = getSpotifyCredentials();
  if (!creds) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status}`);
  }

  const data = (await res.json()) as SpotifyTokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function spotifyGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  return fetchJson<T>(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    provider: "spotify",
  });
}

function mapArtist(artist: SpotifyArtistResponse): SpotifyIngested {
  const imageUrls = (artist.images ?? []).map((i) => i.url).filter(Boolean);
  return {
    artistId: artist.id,
    name: artist.name,
    url: artist.external_urls?.spotify ?? `https://open.spotify.com/artist/${artist.id}`,
    genres: artist.genres ?? [],
    followers: artist.followers?.total ?? 0,
    popularity: artist.popularity ?? 0,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    relatedArtists: [],
  };
}

export async function fetchSpotifyArtistById(artistId: string): Promise<SpotifyIngested> {
  const artist = await spotifyGet<SpotifyArtistResponse>(`/artists/${artistId}`);
  const ingested = mapArtist(artist);

  try {
    const related = await spotifyGet<SpotifyRelatedResponse>(
      `/artists/${artistId}/related-artists`
    );
    ingested.relatedArtists = related.artists.slice(0, 20).map((a) => ({
      id: a.id,
      name: a.name,
    }));
  } catch {
    // Related artists endpoint may fail for some IDs — non-fatal
  }

  return ingested;
}

function foldName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export async function searchSpotifyArtist(name: string): Promise<SpotifyIngested | null> {
  const q = encodeURIComponent(name);
  const result = await spotifyGet<SpotifySearchResponse>(
    `/search?type=artist&q=${q}&limit=5`
  );
  const items = result.artists?.items ?? [];
  if (items.length === 0) return null;

  const target = foldName(name);
  if (!target) return null;

  const exact = items.find((i) => foldName(i.name) === target);
  const stripTarget = target.replace(/\d+$/, "");
  const stripMatch = items.find((i) => {
    const f = foldName(i.name).replace(/\d+$/, "");
    return f.length >= 4 && f === stripTarget;
  });

  const match = exact ?? stripMatch;
  if (!match) return null;
  return fetchSpotifyArtistById(match.id);
}

export function isSpotifyConfigured(): boolean {
  return !!getSpotifyCredentials();
}
