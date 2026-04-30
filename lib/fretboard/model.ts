/**
 * String index 0 = high E (thin, drawn at top of neck).
 * String index 5 = low E (thick, bottom).
 */
export type StringIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type FretPosition = {
  stringIndex: StringIndex;
  /** 0 = open; otherwise the fret number where the finger presses. */
  fret: number;
};

/** Standard tuning open-string MIDI notes (high E → low E). */
export const STANDARD_OPEN_MIDI: readonly number[] = [64, 59, 55, 50, 45, 40];

export function midiAtPosition(
  stringIndex: number,
  fret: number,
  openMidis: readonly number[] = STANDARD_OPEN_MIDI,
): number {
  const open = openMidis[stringIndex];
  if (open === undefined) throw new Error(`Invalid stringIndex ${stringIndex}`);
  return open + fret;
}

/** Inlay frets (typical single / double markers). */
export const INLAY_FRETS = [3, 5, 7, 9, 12, 15] as const;
