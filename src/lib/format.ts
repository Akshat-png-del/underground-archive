/** Locale-independent display formatting — safe for SSR hydration. */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** DD/MM/YYYY — identical output on server and client. */
export function formatDisplayDate(input: string | Date | number): string {
  if (typeof input === "string") {
    const iso = input.match(ISO_DATE);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }

  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);

  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Date portion of an ISO timestamp — same rules as formatDisplayDate. */
export function formatDisplayDateTime(iso: string): string {
  return formatDisplayDate(iso);
}

/** Fixed-locale number grouping (e.g. 1,234). */
export function formatLocaleNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/** UTC calendar year — avoids timezone edge cases at year boundaries. */
export function formatCurrentYear(): number {
  return new Date().getUTCFullYear();
}
