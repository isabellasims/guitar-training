/** Natural minor (Aeolian) intervals from tonic pitch class. */
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10] as const;
/** Major (Ionian) intervals from tonic pitch class. */
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;

export type KeyMode = "major" | "minor";

/**
 * MIDI note for a scale degree (1–7) in a key, chosen octave so pitch is near `tonicMidi`.
 * `tonicMidi` can be any octave (e.g. 60 for middle C).
 */
export function midiForScaleDegree(
  tonicMidi: number,
  mode: KeyMode,
  degree: number,
): number {
  const d = ((degree - 1) % 7) + 1;
  const intervals = mode === "major" ? MAJOR_INTERVALS : MINOR_INTERVALS;
  const tonicPc = ((Math.round(tonicMidi) % 12) + 12) % 12;
  const interval = intervals[d - 1];
  if (interval === undefined) throw new Error(`Invalid degree ${degree}`);
  const pc = (tonicPc + interval) % 12;
  const base = Math.round(tonicMidi);
  let midi = base + (pc - ((base % 12) + 12) % 12);
  while (midi < base - 6) midi += 12;
  while (midi > base + 6) midi -= 12;
  return midi;
}
