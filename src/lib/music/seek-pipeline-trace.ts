/**
 * Seek pipeline runtime trace — logging only, no behavior changes.
 * Enable: localStorage.setItem('vf:seek-trace', '1')
 */

const STORAGE_KEY = "vf:seek-trace";

let traceSeq = 0;

export function isSeekPipelineTraceEnabled(): boolean {
  if (typeof window === "undefined") return process.env.NODE_ENV !== "production";
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    // ignore
  }
  return process.env.NODE_ENV !== "production";
}

function nextId(): number {
  traceSeq += 1;
  return traceSeq;
}

function stackSnippet(depth = 4): string {
  const err = new Error();
  const lines = (err.stack ?? "").split("\n").slice(2, 2 + depth);
  return lines.map((l) => l.trim()).join(" | ");
}

export type SeekTraceKind =
  | "ENTER"
  | "EXIT"
  | "EARLY_RETURN"
  | "INVOKE"
  | "BRANCH"
  | "STATE"
  | "NATIVE"
  | "GUARD"
  | "LISTENER";

export function seekPipelineTrace(
  fn: string,
  kind: SeekTraceKind,
  detail?: Record<string, unknown>,
): void {
  if (!isSeekPipelineTraceEnabled()) return;
  const id = nextId();
  const ts = typeof performance !== "undefined" ? performance.now().toFixed(1) : String(Date.now());
  const base = { id, ts, fn, kind, ...detail };
  if (kind === "EARLY_RETURN" || kind === "GUARD") {
    console.log(`[TRACE] ${fn} ${kind}`, base, "\nstack:", stackSnippet(5));
    return;
  }
  if (kind === "INVOKE") {
    console.log(`[TRACE] ${fn} → ${detail?.next ?? "?"}`, base);
    return;
  }
  console.log(`[TRACE] ${fn} ${kind}`, base);
}

export function seekPipelineTraceBlock(fn: string, lines: Record<string, unknown>): void {
  if (!isSeekPipelineTraceEnabled()) return;
  const id = nextId();
  const ts = typeof performance !== "undefined" ? performance.now().toFixed(1) : String(Date.now());
  console.log(`[TRACE] ${fn}`, { id, ts, ...lines });
}
