export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length]!;
}

function isSubsequence(query: string, target: string): boolean {
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++;
  }
  return qi === query.length;
}

function typoThreshold(queryLength: number): number {
  if (queryLength <= 3) return 1;
  if (queryLength <= 5) return 2;
  return Math.ceil(queryLength * 0.4);
}

function splitSearchTokens(text: string): string[] {
  return text.split(/[\s\-_./]+/).filter(Boolean);
}

/**
 * Higher scores mean stronger matches. Returns 0 when the query does not match.
 */
export function fuzzyMatchScore(query: string, target: string): number {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(target);
  if (!q || !t) return 0;

  if (t === q) return 10000;
  if (t.startsWith(q)) return 9000 - (t.length - q.length) * 2;

  const words = splitSearchTokens(t);
  for (const word of words) {
    if (word.startsWith(q)) return 8000 - (word.length - q.length) * 2;
  }

  if (q.length === 1) return 0;

  if (t.includes(q)) return 5000 - t.indexOf(q);

  if (isSubsequence(q, t)) return 3000 - (t.length - q.length);

  const threshold = typoThreshold(q.length);

  if (q.length <= 8) {
    const dist = levenshtein(q, t);
    if (dist <= threshold) return 2000 - dist * 100;
  }

  for (const word of words) {
    if (word.length < q.length - 2) continue;
    const dist = levenshtein(q, word);
    if (dist <= threshold) return 1500 - dist * 100 - Math.max(0, word.length - q.length);
  }

  if (q.length >= 3) {
    const prefix = t.slice(0, Math.min(t.length, q.length + 2));
    const dist = levenshtein(q, prefix);
    if (dist <= Math.min(2, threshold)) return 1200 - dist * 100;
  }

  return 0;
}

export function bestFuzzyScore(query: string, fields: string[]): number {
  let best = 0;
  for (const field of fields) {
    best = Math.max(best, fuzzyMatchScore(query, field));
  }
  return best;
}
