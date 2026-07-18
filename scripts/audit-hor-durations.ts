import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { YOUTUBE_VERIFIED_DURATIONS } from "../src/lib/catalog/youtube-verified-durations";

const MIN = 600;
const map: Record<string, number> = {};
for (const [id, v] of Object.entries(YOUTUBE_VERIFIED_DURATIONS)) {
  map[id] = v.seconds;
}
const hor: { slug: string; id: string; title: string; secs: number | null }[] = [];
for (const f of readdirSync("data/catalog-expansion").filter((x) => x.endsWith(".json"))) {
  const d = JSON.parse(readFileSync(join("data/catalog-expansion", f), "utf8"));
  for (const s of d.sets || []) {
    const t = s.title || "";
    if (!(t.includes("HÖR") || t.includes("HÖR") || s.venue === "HÖR Berlin")) continue;
    const secs = map[s.youtubeId] ?? null;
    hor.push({ slug: d.slug, id: s.youtubeId, title: t, secs });
  }
}
const bad = hor.filter((h) => h.secs == null || h.secs < MIN);
const ok = hor.filter((h) => h.secs != null && h.secs >= MIN);

// Remove too-short / unverified HÖR sets
let removed = 0;
for (const f of readdirSync("data/catalog-expansion").filter((x) => x.endsWith(".json"))) {
  const path = join("data/catalog-expansion", f);
  const d = JSON.parse(readFileSync(path, "utf8"));
  const before = d.sets.length;
  d.sets = d.sets.filter((s: { youtubeId: string; title: string; venue?: string }) => {
    const t = s.title || "";
    const isHor = t.includes("HÖR") || t.includes("HÖR") || s.venue === "HÖR Berlin";
    if (!isHor) return true;
    const secs = map[s.youtubeId];
    return typeof secs === "number" && secs >= MIN;
  });
  if (d.sets.length !== before) {
    removed += before - d.sets.length;
    d.updatedAt = new Date().toISOString();
    writeFileSync(path, `${JSON.stringify(d, null, 2)}\n`);
  }
}

writeFileSync(
  ".tmp/hor-duration-audit.json",
  JSON.stringify({ total: hor.length, ok: ok.length, bad: bad.length, removed, bad }, null, 2),
);
console.log({ total: hor.length, ok: ok.length, bad: bad.length, removed });
for (const b of bad.slice(0, 25)) console.log(`  BAD ${b.slug} ${b.id} ${b.secs}s ${b.title.slice(0, 60)}`);
