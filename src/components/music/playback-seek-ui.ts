/** Map a pointer X coordinate to seconds on a range input track. */
export function seekSecondsFromClientX(
  input: HTMLInputElement,
  clientX: number,
  duration: number,
): number {
  if (duration <= 0) return 0;
  const rect = input.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const max = Number(input.max) || duration;
  return ratio * max;
}
