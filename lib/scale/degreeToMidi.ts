/** Natural minor (Aeolian) intervals from tonic pitch class. */
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10] as const;
/** Major (Ionian) intervals from tonic pitch class. */
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;

export type KeyMode = "major" | "minor";

/**
 * MIDI note for a scale degree (1–7) in a key, in the same octave span as the rounded tonic
 * (e.g. C4 tonic → degrees stay C4–B4; fifth is G4 not G3).
 *
 * Previous logic clamped to `base ± 6` semitones, which pulled the 5th and above down an octave
 * and broke ascending scales and pitch targets.
 */
export function midiForScaleDegree(
  tonicMidi: number,
  mode: KeyMode,
  degree: number,
): number {
  const d = ((degree - 1) % 7) + 1;
  const intervals = mode === "major" ? MAJOR_INTERVALS : MINOR_INTERVALS;
  const root = Math.round(tonicMidi);
  const tonicPc = ((root % 12) + 12) % 12;
  const interval = intervals[d - 1];
  if (interval === undefined) throw new Error(`Invalid degree ${degree}`);
  const pc = (tonicPc + interval) % 12;
  const semitoneOffset = (pc - tonicPc + 12) % 12;
  return root + semitoneOffset;
}
