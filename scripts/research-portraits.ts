#!/usr/bin/env npx tsx
/**
 * Deep portrait research for artists without verified portraits.
 * Only auto-downloads HIGH confidence matches.
 * Usage: npx tsx scripts/research-portraits.ts
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { artists } from "../src/content/artists/all";
import { hasVerifiedArtistImage } from "../src/lib/archive/images/apply";
import { isSuspiciousPortraitUrl } from "../src/lib/archive/images/validate";
import {
  researchArtistPortrait,
  CURATED_OFFICIAL_PROFILES,
  type PortraitResearchResult,
} from "../src/lib/ingestion/portrait-deep-research";
import { sleep } from "../src/lib/ingestion/http";

const MANUAL_DEEP = new Set(Object.keys(CURATED_OFFICIAL_PROFILES));

function needsPortraitResearch(portrait: string, slug: string): boolean {
  if (MANUAL_DEEP.has(slug)) return true;
  if (!portrait || portrait.includes("/images/genres/")) return true;
  if (isSuspiciousPortraitUrl(portrait)) return true;
  return false;
}

async function downloadPortrait(slug: string, imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "UndergroundArchive/1.0 (portrait-research)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const dir = join(process.cwd(), "public/images/portraits/researched");
    mkdirSync(dir, { recursive: true });
    const rel = `/images/portraits/researched/${slug}.${ext}`;
    const abs = join(process.cwd(), "public/images/portraits/researched", `${slug}.${ext}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return null;
    writeFileSync(abs, buf);
    return rel;
  } catch {
    return null;
  }
}

function formatResultBlock(r: PortraitResearchResult): string[] {
  const lines = [`### ${r.name} (\`${r.slug}\`)`, ""];
  if (r.accepted && r.candidate) {
    lines.push(
      "**Portrait found:** yes (accepted)",
      `**Source:** ${r.candidate.source}`,
      `**Source URL:** ${r.candidate.sourceUrl}`,
      `**Image URL:** ${r.candidate.imageUrl}`,
      `**Confidence:** high`,
      r.candidate.notes ? `**Notes:** ${r.candidate.notes}` : ""
    );
  } else if (r.found && r.candidates.length) {
    const best = r.candidates[0];
    lines.push(
      "**Portrait found:** yes (not auto-accepted)",
      `**Best candidate source:** ${best.source}`,
      `**Source URL:** ${best.sourceUrl}`,
      `**Confidence:** ${best.confidence}`,
      `**Reason:** ${r.notFoundReason ?? "Below HIGH threshold"}`
    );
    if (r.candidates.length > 1) {
      lines.push("", "**Other candidates:**");
      for (const c of r.candidates.slice(1, 4)) {
        lines.push(`- ${c.source} (${c.confidence}): ${c.sourceUrl}`);
      }
    }
  } else {
    lines.push(
      "**Portrait found:** no",
      `**Reason:** ${r.notFoundReason ?? "No candidates"}`
    );
  }
  if (r.manualDeepResearch) {
    lines.push("", "_Flagged for deep manual research — verify identity before publishing._");
  }
  lines.push("");
  return lines.filter(Boolean);
}

async function main() {
  const targets = artists.filter(
    (a) => !hasVerifiedArtistImage(a) && needsPortraitResearch(a.portrait ?? "", a.slug)
  );

  const results: PortraitResearchResult[] = [];
  const accepted: PortraitResearchResult[] = [];

  console.log(`Researching ${targets.length} artists without verified portraits…\n`);

  for (const artist of targets) {
    console.log(`→ ${artist.slug}`);
    const result = await researchArtistPortrait({
      slug: artist.slug,
      name: artist.name,
      genres: artist.genres,
      labels: artist.labels,
      city: artist.city,
      country: artist.country,
      spotifyArtistId: artist.spotifyArtistId,
      aliases: artist.name.includes("(") ? [] : undefined,
    });

    if (result.accepted && result.candidate) {
      const localPath = await downloadPortrait(artist.slug, result.candidate.imageUrl);
      if (localPath) {
        const metaDir = join(process.cwd(), "data/portrait-research");
        mkdirSync(metaDir, { recursive: true });
        writeFileSync(
          join(metaDir, `${artist.slug}.json`),
          `${JSON.stringify(
            {
              ...result,
              localPath,
              downloadedAt: new Date().toISOString(),
            },
            null,
            2
          )}\n`,
          "utf8"
        );
      }
      accepted.push(result);
    }

    results.push(result);
    await sleep(500);
  }

  const manual = results.filter((r) => r.manualDeepResearch);
  const genreMissing = results.filter((r) => !r.manualDeepResearch);

  const lines: string[] = [
    "# Deep portrait research report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| --- | --- |`,
    `| Artists researched | ${results.length} |`,
    `| HIGH confidence accepted | ${accepted.length} |`,
    `| Found but not accepted (medium/low) | ${results.filter((r) => r.found && !r.accepted).length} |`,
    `| Not found | ${results.filter((r) => !r.found).length} |`,
    "",
    "## Manual deep research (Tier 1)",
    "",
  ];

  for (const r of manual) {
    lines.push(...formatResultBlock(r));
  }

  lines.push("## Genre-fallback / missing portraits", "");
  for (const r of genreMissing) {
    lines.push(...formatResultBlock(r));
  }

  lines.push("## Accepted portraits (HIGH confidence)", "");
  if (!accepted.length) {
    lines.push("_None auto-accepted in this run._");
  } else {
    for (const r of accepted) {
      const c = r.candidate!;
      lines.push(
        `- **${r.slug}** — ${c.source} — [source](${c.sourceUrl}) — confidence: **high**`
      );
    }
  }

  const markdown = lines.join("\n");
  const outPath = join(process.cwd(), "reports/portrait-deep-research.md");
  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  writeFileSync(outPath, markdown, "utf8");

  console.log(`\nDone: ${accepted.length} accepted, report → ${outPath}`);
  console.log(markdown.slice(0, 3000));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
