import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchJson, sleep } from "../src/lib/ingestion/http";

const SLUGS = ["fernanda-martins", "kas-st"];
const NAMES: Record<string, string> = { "fernanda-martins": "Fernanda Martins", "kas-st": "KAS:ST" };

async function mbTags(name: string): Promise<string[]> {
  await sleep(1200);
  const search = await fetchJson<{ artists?: { id: string; score: number }[] }>(
    `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(`artist:"${name}"`)}&fmt=json&limit=5`,
    { provider: "musicbrainz" },
  );
  const top = search.artists?.sort((a, b) => b.score - a.score)[0];
  if (!top) return [];
  await sleep(1200);
  const d = await fetchJson<{ tags?: { name?: string }[]; genres?: { name?: string }[] }>(
    `https://musicbrainz.org/ws/2/artist/${top.id}?fmt=json&inc=tags+genres`,
    { provider: "musicbrainz" },
  );
  return [...(d.tags ?? []).map((t) => t.name ?? ""), ...(d.genres ?? []).map((g) => g.name ?? "")].filter(Boolean);
}

async function main() {
  for (const slug of SLUGS) {
    const p = join(process.cwd(), ".tmp/target-artists", `${slug}.json`);
    const e = JSON.parse(readFileSync(p, "utf8"));
    const tags = await mbTags(NAMES[slug]);
    e.mbTags = tags;
    writeFileSync(p, `${JSON.stringify(e, null, 2)}\n`, "utf8");
    console.log(`${slug}: spotifyName="${e.spotifyName}" tracks=[${e.tracks.map((t: any) => t.title).join(" | ")}]`);
    console.log(`   mbTags=[${tags.join(", ")}]`);
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
