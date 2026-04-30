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

/**
 * Labels at the nut (high e lowercase, low E uppercase; others as usual).
 * Index matches stringIndex 0 = high e … 5 = low E.
 */
export const OPEN_STRING_LABELS = ["e", "B", "G", "D", "A", "E"] as const;

/** Position markers: 3, 5, 7, 8, 12 (double), 15. */
export const INLAY_FRETS = [3, 5, 7, 8, 12, 15] as const;

/** e.g. "open", "3rd fret", "12th fret". */
export function ordinalFretPhrase(fret: number): string {
  if (fret === 0) return "open";
  if (fret === 1) return "1st fret";
  if (fret === 2) return "2nd fret";
  if (fret === 3) return "3rd fret";
  const mod100 = fret % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${fret}th fret`;
  switch (fret % 10) {
    case 1:
      return `${fret}st fret`;
    case 2:
      return `${fret}nd fret`;
    case 3:
      return `${fret}rd fret`;
    default:
      return `${fret}th fret`;
  }
}
