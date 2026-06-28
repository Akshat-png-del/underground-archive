#!/usr/bin/env npx tsx
import { fetchJson, sleep } from "../src/lib/ingestion/http";
import { fetchSpotifyPortrait } from "../src/lib/ingestion/opengraph";
import { namesMatch } from "../src/lib/archive/pipeline/validate";

async function probe(id: string) {
  const url = `https://open.spotify.com/artist/${id}`;
  const res = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const d = (await res.json()) as { title?: string; thumbnail_url?: string };
  return { id, title: d.title, thumb: d.thumbnail_url };
}

async function mbSpotify(name: string): Promise<string | null> {
  await sleep(1100);
  const q = encodeURIComponent(`artist:"${name}"`);
  const search = await fetchJson<{
    artists?: { id: string; name: string; score: number }[];
  }>(`https://musicbrainz.org/ws/2/artist?query=${q}&fmt=json&limit=5`, {
    provider: "musicbrainz",
  });
  const artist = search.artists?.sort((a, b) => b.score - a.score)[0];
  if (!artist || !namesMatch(name, artist.name)) return null;
  await sleep(1100);
  const detail = await fetchJson<{
    relations?: { url?: { resource: string } }[];
  }>(
    `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=url-rels&fmt=json`,
    { provider: "musicbrainz" }
  );
  for (const rel of detail.relations ?? []) {
    const m = rel.url?.resource?.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]{22})/);
    if (m) return m[1];
  }
  return null;
}

const CANDIDATES: Record<string, string[]> = {
  "hector-oaks": ["2FZAQdFEANNv5Gi29PI10x"],
  ansome: ["14gRo11WOeTXBDcgFr8Ejb"],
  "alex-bau": ["0NepOrVsrboBKYECeSmwak"],
  deepbass: ["4JBXPj21sTqOZvgQurUJoP"],
  petduo: ["5SEUYqumyvmrkgWpOco1lo"],
  lft: ["0CxkG7EdCzA4QJoDeiODFP"],
  hante: ["5PhSiNjHZevtfAj9zmvVkU"],
};

const MB_NAMES: Record<string, string> = {
  "len-d": "Len D",
  "petra-flurr": "Petra Flurr",
  weichentechnikk: "Weichentechnikk",
  "debora-alessio": "Debora Alessio",
  psyk32: "Psyk32",
  rumina: "Rumina",
  "per-sona": "Per-sona",
};

async function main() {
  for (const [slug, ids] of Object.entries(CANDIDATES)) {
    for (const id of ids) {
      const r = await probe(id);
      console.log(slug, r);
    }
  }

  console.log("\n--- MusicBrainz ---");
  for (const [slug, name] of Object.entries(MB_NAMES)) {
    const id = await mbSpotify(name);
    if (id) {
      const r = await probe(id);
      const portrait = await fetchSpotifyPortrait(id);
      console.log(slug, { id, ...r, portrait: portrait?.slice(0, 60) });
    } else {
      console.log(slug, "not found");
    }
  }
}

main();
