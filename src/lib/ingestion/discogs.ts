import { fetchJson, sleep } from "./http";
import { getDiscogsToken } from "./config";
import type { DiscogsIngested } from "./types";

interface DiscogsSearchResponse {
  results?: {
    id: number;
    title: string;
    thumb?: string;
    cover_image?: string;
    uri?: string;
  }[];
}

export function isDiscogsConfigured(): boolean {
  return !!getDiscogsToken();
}

export async function fetchDiscogsArtist(name: string): Promise<DiscogsIngested | null> {
  const token = getDiscogsToken();
  if (!token) {
    throw new Error("DISCOGS_TOKEN is required");
  }

  const q = encodeURIComponent(name);
  const search = await fetchJson<DiscogsSearchResponse>(
    `https://api.discogs.com/database/search?q=${q}&type=artist&per_page=5&token=${token}`,
    { provider: "discogs" }
  );

  const match = search.results?.[0];
  if (!match) return null;

  await sleep(1100);

  const detail = await fetchJson<{
    name: string;
    profile?: string;
    images?: { uri: string; type: string }[];
    uri?: string;
  }>(`https://api.discogs.com/artists/${match.id}?token=${token}`, { provider: "discogs" });

  const photo = detail.images?.find((i) => i.type === "primary" || i.type === "artist") ?? detail.images?.[0];

  return {
    id: match.id,
    name: detail.name ?? match.title,
    profile: detail.profile ?? null,
    imageUrl: photo?.uri ?? match.cover_image ?? null,
    thumbUrl: match.thumb ?? null,
    uri: detail.uri ?? match.uri ?? null,
  };
}
