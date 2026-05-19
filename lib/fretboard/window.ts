import type { ShapeRecallStep } from "@/lib/cards/types";

/**
 * Pick a sensible fretboard window for rendering a shape diagram.
 *
 * Goal: keep the per-fret zoom level constant across keys so a shape up
 * the neck doesn't render as an unreadably-shrunk diagram. Returns the
 * `{ startFret, maxFret }` window the Fretboard should render.
 *
 *   - If any step uses an open string (fret 0), we fall back to the
 *     open-position view (`startFret = 0`) so the nut and open-string
 *     letters are visible.
 *   - Otherwise we frame the played frets with one fret of headroom on
 *     each side. Tiny shapes get a 5-fret minimum window so the diagram
 *     doesn't look claustrophobically narrow.
 *   - In all cases `startFret >= 0` and `maxFret > startFret`.
 *
 * @param steps   the shape's positions
 * @param padding how many spare frets to draw on each side (default 1)
 * @param minSpan minimum number of cells in the window (default 5)
 */
export function windowForSteps(
  steps: readonly ShapeRecallStep[],
  padding = 1,
  minSpan = 5,
): { startFret: number; maxFret: number } {
  if (steps.length === 0) {
    return { startFret: 0, maxFret: Math.max(5, minSpan) };
  }
  let minFret = Number.POSITIVE_INFINITY;
  let maxFret = Number.NEGATIVE_INFINITY;
  for (const s of steps) {
    if (s.fret < minFret) minFret = s.fret;
    if (s.fret > maxFret) maxFret = s.fret;
  }
  // Anchor at the open position whenever the shape touches the nut.
  if (minFret <= 0) {
    return { startFret: 0, maxFret: Math.max(maxFret + padding, minSpan) };
  }
  // Otherwise give one fret of headroom on each side.
  const start = Math.max(0, minFret - padding);
  const end = Math.max(maxFret + padding, start + minSpan);
  // If the window naturally lands at fret 0 or below, just use the
  // open-position view so the nut renders.
  if (start === 0) {
    return { startFret: 0, maxFret: end };
  }
  return { startFret: start, maxFret: end };
}
