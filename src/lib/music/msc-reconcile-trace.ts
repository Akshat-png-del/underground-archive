/**
 * MSC reconcile path trace — logging only.
 * Enable: localStorage.setItem('vf:msc-reconcile-trace', '1')
 */

const STORAGE_KEY = "vf:msc-reconcile-trace";
let seq = 0;

export function isMscReconcileTraceEnabled(): boolean {
  if (typeof window === "undefined") return process.env.NODE_ENV !== "production";
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    // ignore
  }
  return process.env.NODE_ENV !== "production";
}

export function mscReconcileTrace(
  fn: string,
  kind: "ENTER" | "EXIT" | "BRANCH" | "GUARD" | "PATCH" | "SKIP_PATCH" | "EARLY_RETURN",
  detail?: Record<string, unknown>,
): void {
  if (!isMscReconcileTraceEnabled()) return;
  seq += 1;
  console.log(`[MSC-RECONCILE] ${fn} ${kind}`, { id: seq, ...detail });
}
