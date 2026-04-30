import type { StringIndex } from "@/lib/fretboard/model";
import { STANDARD_OPEN_MIDI } from "@/lib/fretboard/model";

/** Letter + optional accidental → pitch class 0–11. */
const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

export function parseNoteNameToPitchClass(raw: string): number | null {
  const s = raw.trim().replace(/♯/g, "#").replace(/♭/g, "b");
  if (!s) return null;
  const m = s.match(/^([A-Ga-g])([#b]?)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const acc = (m[2] ?? "") as "" | "#" | "b";
  const key = acc ? `${letter}${acc}` : letter;
  const pc = NOTE_TO_PC[key];
  return pc === undefined ? null : pc;
}

/**
 * Lowest fret on the string (0–maxFret inclusive) that plays the named note.
 */
export function targetMidiNoteOnString(
  noteName: string,
  stringIndex: number,
  maxFret = 12,
): number | null {
  const pc = parseNoteNameToPitchClass(noteName);
  if (pc === null) return null;
  const open = STANDARD_OPEN_MIDI[stringIndex];
  if (open === undefined) return null;
  for (let fret = 0; fret <= maxFret; fret++) {
    const midi = open + fret;
    if (((midi % 12) + 12) % 12 === pc) return midi;
  }
  return null;
}

/** User-facing string name (matches manual: 5th string = A, etc.). */
export function stringIndexToPedagogyLabel(i: StringIndex): string {
  const labels = [
    "1st string (high e)",
    "2nd string (B)",
    "3rd string (G)",
    "4th string (D)",
    "5th string (A)",
    "6th string (low E)",
  ];
  return labels[i] ?? `string ${i}`;
}
