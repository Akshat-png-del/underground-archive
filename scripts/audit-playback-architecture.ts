/**
 * Playback Reliability Protocol — architecture guard.
 *
 * Run: npm run audit:playback-arch
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

const FORBIDDEN_UI_IMPORT_PATTERNS = [
  /global-player-engine/,
  /spotify-embed-api/,
  /youtube-embed-api/,
  /lib\/music\/providers/,
];

const ENGINE_IMPORT_ALLOWLIST = new Set([
  "src/stores/playback-store.ts",
  "src/lib/music/global-player-engine.ts",
  "src/lib/music/playback-test-harness.ts",
]);

/** UI must dispatch via actions, not store action selectors. */
const FORBIDDEN_UI_STORE_DISPATCH =
  /usePlaybackStore\(\s*\(\s*s\s*\)\s*=>\s*s\.(play|pause|resume|stop|seek|togglePlayPause|openDetails|closeDetails|next|previous)\b/;

interface Violation {
  file: string;
  line: number;
  rule: string;
  text: string;
}

const violations: Violation[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function isUiFile(rel: string): boolean {
  return rel.startsWith("src/components/") || rel.startsWith("src/app/");
}

function auditFile(absPath: string): void {
  const content = readFileSync(absPath, "utf8");
  const lines = content.split("\n");
  const rel = relative(ROOT, absPath).replace(/\\/g, "/");

  if (isUiFile(rel)) {
    lines.forEach((line, i) => {
      if (line.includes("import")) {
        for (const pattern of FORBIDDEN_UI_IMPORT_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: rel,
              line: i + 1,
              rule: "UI must not import engine or media providers",
              text: line.trim(),
            });
          }
        }
      }

      if (/createElement\s*\(\s*["'](?:iframe|audio)["']\s*\)/.test(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: "UI must not create media elements",
          text: line.trim(),
        });
      }

      if (FORBIDDEN_UI_STORE_DISPATCH.test(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: "UI must dispatch playback-actions, not store actions",
          text: line.trim(),
        });
      }

      if (/getElementById\s*\(\s*["']vitalforge-playback-root["']\s*\)/.test(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: "UI must not reference engine DOM root",
          text: line.trim(),
        });
      }
    });
  }

  if (
    content.includes("global-player-engine") &&
    !ENGINE_IMPORT_ALLOWLIST.has(rel) &&
    !rel.startsWith("scripts/") &&
    !rel.startsWith("tests/")
  ) {
    lines.forEach((line, i) => {
      if (line.includes("import") && line.includes("global-player-engine")) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: "Only playback-store may import global-player-engine",
          text: line.trim(),
        });
      }
    });
  }
}

function auditSingletonPlaybackRoot(): void {
  const layoutPath = join(SRC, "app/layout.tsx");
  if (!statSync(layoutPath).isFile()) return;
  const content = readFileSync(layoutPath, "utf8");
  const matches = content.match(/<PlaybackRoot/g) ?? [];
  if (matches.length !== 1) {
    violations.push({
      file: "src/app/layout.tsx",
      line: 0,
      rule: "Exactly one <PlaybackRoot /> in app layout",
      text: `found ${matches.length} PlaybackRoot mounts`,
    });
  }
}

function auditPlaybackInvariantBootstrapOrder(): void {
  const layoutPath = join(SRC, "app/layout.tsx");
  const providersPath = join(SRC, "components/providers/Providers.tsx");
  if (!statSync(layoutPath).isFile() || !statSync(providersPath).isFile()) return;

  const layout = readFileSync(layoutPath, "utf8");
  const providers = readFileSync(providersPath, "utf8");

  if (providers.includes("PlaybackUiInvariantGuard")) {
    violations.push({
      file: "src/components/providers/Providers.tsx",
      line: 0,
      rule: "PlaybackUiInvariantGuard must not mount before PlaybackRoot bootstrap",
      text: "move <PlaybackUiInvariantGuard /> to layout.tsx after <PlaybackRoot />",
    });
  }

  const rootIdx = layout.indexOf("<PlaybackRoot");
  const guardIdx = layout.indexOf("<PlaybackUiInvariantGuard");
  if (guardIdx === -1) {
    violations.push({
      file: "src/app/layout.tsx",
      line: 0,
      rule: "PlaybackUiInvariantGuard required after PlaybackRoot bootstrap",
      text: "missing <PlaybackUiInvariantGuard /> after <PlaybackRoot />",
    });
    return;
  }
  if (rootIdx === -1 || rootIdx > guardIdx) {
    violations.push({
      file: "src/app/layout.tsx",
      line: 0,
      rule: "PlaybackUiInvariantGuard must mount after PlaybackRoot",
      text: "layout.tsx must list <PlaybackRoot /> before <PlaybackUiInvariantGuard />",
    });
  }
}

function main(): void {
  for (const file of walk(SRC)) auditFile(file);
  auditSingletonPlaybackRoot();
  auditPlaybackInvariantBootstrapOrder();

  if (violations.length === 0) {
    console.log("✓ Playback Reliability Protocol audit passed.");
    return;
  }

  console.error(`✗ Playback audit failed — ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    [${v.rule}]`);
    console.error(`    ${v.text}\n`);
  }
  process.exit(1);
}

main();
