import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const GLOBALS = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
const LAYOUT = readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");

test("globals.css contains playback UI layout contract", () => {
  assert.ok(GLOBALS.includes(".spotify-player-bar"));
  assert.ok(GLOBALS.includes("position: fixed"));
  assert.ok(GLOBALS.includes(".set-watch-host"));
  assert.ok(GLOBALS.includes("pointer-events: auto !important"));
  assert.ok(GLOBALS.includes('[data-playback-experience="audio"]'));
  assert.ok(GLOBALS.includes("[data-set-watch-page]"));
});

test("layout mounts PlaybackUiInvariantGuard after PlaybackRoot", () => {
  const rootIdx = LAYOUT.indexOf("<PlaybackRoot");
  const guardIdx = LAYOUT.indexOf("<PlaybackUiInvariantGuard");
  assert.ok(rootIdx !== -1, "layout must include PlaybackRoot");
  assert.ok(guardIdx !== -1, "layout must include PlaybackUiInvariantGuard");
  assert.ok(rootIdx < guardIdx, "PlaybackRoot must precede PlaybackUiInvariantGuard");
});

test("Providers does not mount PlaybackUiInvariantGuard before bootstrap", () => {
  const providers = readFileSync(join(ROOT, "src/components/providers/Providers.tsx"), "utf8");
  assert.doesNotMatch(providers, /PlaybackUiInvariantGuard/);
});
