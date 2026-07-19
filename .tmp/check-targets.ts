import { artists } from "../src/content/artists/all";

const TARGETS = [
  "BYORN", "KUKO", "Lessss", "Luciid", "Doruksen", "Kander", "Callush", "KRL MX",
  "6EJOU", "AIROD", "Fatima Hajji", "Fernanda Martins", "Otta", "SNTS",
  "Tommy Four Seven", "Headless Horseman", "Inhalt der Nacht", "Scalameriya",
  "DJ Hyperdrive", "MISCHLUFT", "Onlynumbers", "XRTN", "KUSS", "Jazzy", "KAS:ST",
];

function fold(t: string): string {
  return (t ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

const byFold = new Map<string, { name: string; slug: string }>();
for (const a of artists) {
  byFold.set(fold(a.name), { name: a.name, slug: a.slug });
  byFold.set(fold(a.slug), { name: a.name, slug: a.slug });
}

console.log(`Total displayed artists: ${artists.length}\n`);
const exists: string[] = [];
const missing: string[] = [];
for (const t of TARGETS) {
  const hit = byFold.get(fold(t));
  if (hit) {
    exists.push(`${t} -> ${hit.name} (${hit.slug})`);
  } else {
    missing.push(t);
  }
}
console.log(`ALREADY EXISTS (${exists.length}):`);
exists.forEach((e) => console.log("  " + e));
console.log(`\nMISSING (${missing.length}):`);
missing.forEach((m) => console.log("  " + m));
