/**
 * Shared chord + diatonic-key helpers. Used by both the curriculum content
 * (Track D drill voicings) and the Chord Explorer feature.
 *
 * Conventions:
 *   - MIDI pitches use middle C = 60 (so C4 = 60, A4 = 69).
 *   - Triad voicings are root-position (root, 3rd, 5th in semitones above root).
 *   - "Pitch class" is the chromatic note ignoring octave (0..11).
 */

export type ChordQuality = "M" | "m" | "dim";

/** Triad interval patterns above the root. */
export const TRIAD_INTERVALS: Record<ChordQuality, number[]> = {
  M: [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
};

/** Build a triad voicing at a given root MIDI pitch. */
export function triad(rootMidi: number, quality: ChordQuality): number[] {
  return TRIAD_INTERVALS[quality].map((d) => rootMidi + d);
}

/**
 * Default MIDI for each note name. Tonics live near the middle of the
 * keyboard — F is at F3 (53) and B is at B3 (59) so the existing Track D
 * progressions (C4 → F3 → C4 → G3 → C4) stay close-voiced. New code that
 * needs a tonic-relative voicing should use `diatonicChords()` instead so
 * the octave choice is consistent.
 */
export const ROOT_MIDI: Record<string, number> = {
  C: 60,
  "C#": 61,
  Db: 61,
  D: 62,
  "D#": 63,
  Eb: 63,
  E: 64,
  F: 53,
  "F#": 54,
  Gb: 54,
  G: 55,
  "G#": 56,
  Ab: 56,
  A: 57,
  "A#": 58,
  Bb: 58,
  B: 59,
};

/** Triad rooted at a named pitch (e.g. `chord("F", "M")`). */
export function chord(name: string, quality: ChordQuality): number[] {
  const r = ROOT_MIDI[name];
  if (r == null) throw new Error(`Unknown chord root: ${name}`);
  return triad(r, quality);
}

// ───── Diatonic key computation ─────────────────────────────────────────

/** Scale-degree intervals (in semitones above the tonic). */
const DIATONIC_SEMIS_MAJOR = [0, 2, 4, 5, 7, 9, 11] as const;
const DIATONIC_SEMIS_MINOR = [0, 2, 3, 5, 7, 8, 10] as const;

/** Chord qualities on each diatonic degree. */
const QUALITIES_MAJOR: ChordQuality[] = ["M", "m", "m", "M", "M", "m", "dim"];
const QUALITIES_MINOR: ChordQuality[] = ["m", "dim", "M", "m", "m", "M", "M"];

/** Roman-numeral labels per mode. Case carries the major/minor distinction. */
const ROMAN_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"] as const;
const ROMAN_MINOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"] as const;

/** Pretty long-form quality, used in the UI ("D minor", "B diminished"). */
export function qualityLabel(quality: ChordQuality): string {
  return quality === "M" ? "major" : quality === "m" ? "minor" : "diminished";
}

/**
 * Notes of a major key, sharp-spelled. Used for note-name display.
 * Keys that traditionally spell with flats (F, Bb, Eb, Ab, Db, Gb) get
 * flat-spelled below.
 */
const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

/** Pitch-class names of major keys that conventionally use flat spelling. */
const FLAT_MAJOR_TONIC_PCS = new Set([5, 10, 3, 8, 1]); // F, Bb, Eb, Ab, Db
/** Same for minor keys: relative-minor of each flat-spelled major. */
const FLAT_MINOR_TONIC_PCS = new Set([2, 7, 0, 5, 10]); // D, G, C, F, Bb

export function pitchClassToName(
  pc: number,
  spelling: "sharp" | "flat",
): string {
  const idx = ((pc % 12) + 12) % 12;
  return spelling === "flat" ? FLAT_NAMES[idx]! : SHARP_NAMES[idx]!;
}

export function preferredSpellingForKey(
  tonicPc: number,
  mode: "major" | "minor",
): "sharp" | "flat" {
  const pc = ((tonicPc % 12) + 12) % 12;
  if (mode === "major" && FLAT_MAJOR_TONIC_PCS.has(pc)) return "flat";
  if (mode === "minor" && FLAT_MINOR_TONIC_PCS.has(pc)) return "flat";
  return "sharp";
}

export type DiatonicChord = {
  /** 0..6 — position in the scale. */
  degreeIndex: number;
  /** "I", "vi", "vii°", etc. */
  roman: string;
  /** Display name of the chord's root ("C", "Eb", "F#"). */
  rootName: string;
  quality: ChordQuality;
  /** Long-form quality label: "major", "minor", "diminished". */
  qualityLabel: string;
  /** Concrete MIDI note used as the chord's root in the default voicing. */
  rootMidi: number;
  /** Root-position triad in MIDI. */
  notes: number[];
};

/**
 * Compute the seven diatonic chords for a key (major or minor natural).
 *
 * Voicing strategy: chord roots land within a perfect 5th of the tonic to
 * keep the progression close-voiced. Any chord whose interval from the
 * tonic is greater than 7 semitones (i.e. vi and vii in major; VI and VII
 * in minor) is dropped down an octave so the roots don't climb out of the
 * key's natural register.
 */
export function diatonicChords(
  tonicMidi: number,
  mode: "major" | "minor",
): DiatonicChord[] {
  const semis = mode === "major" ? DIATONIC_SEMIS_MAJOR : DIATONIC_SEMIS_MINOR;
  const qualities = mode === "major" ? QUALITIES_MAJOR : QUALITIES_MINOR;
  const romans = mode === "major" ? ROMAN_MAJOR : ROMAN_MINOR;
  const tonicPc = ((tonicMidi % 12) + 12) % 12;
  const spelling = preferredSpellingForKey(tonicPc, mode);

  return semis.map((interval, i) => {
    const dropOctave = interval > 7;
    const rootMidi = tonicMidi + interval - (dropOctave ? 12 : 0);
    const rootPc = ((tonicMidi + interval) % 12 + 12) % 12;
    const quality = qualities[i]!;
    return {
      degreeIndex: i,
      roman: romans[i]!,
      rootName: pitchClassToName(rootPc, spelling),
      quality,
      qualityLabel: qualityLabel(quality),
      rootMidi,
      notes: triad(rootMidi, quality),
    };
  });
}

/**
 * Canonical list of root tonics for the key picker. Each entry includes
 * the MIDI value (rooted near middle C) and the display label.
 */
export type RootChoice = {
  midi: number;
  pc: number;
  /** Sharp spelling, used when the user toggles between # and ♭. */
  sharpName: string;
  /** Flat spelling, when applicable. Same as sharpName for naturals. */
  flatName: string;
};

export const ROOT_CHOICES: RootChoice[] = [
  { midi: 60, pc: 0, sharpName: "C", flatName: "C" },
  { midi: 61, pc: 1, sharpName: "C#", flatName: "Db" },
  { midi: 62, pc: 2, sharpName: "D", flatName: "D" },
  { midi: 63, pc: 3, sharpName: "D#", flatName: "Eb" },
  { midi: 64, pc: 4, sharpName: "E", flatName: "E" },
  { midi: 65, pc: 5, sharpName: "F", flatName: "F" },
  { midi: 66, pc: 6, sharpName: "F#", flatName: "Gb" },
  { midi: 55, pc: 7, sharpName: "G", flatName: "G" },
  { midi: 56, pc: 8, sharpName: "G#", flatName: "Ab" },
  { midi: 57, pc: 9, sharpName: "A", flatName: "A" },
  { midi: 58, pc: 10, sharpName: "A#", flatName: "Bb" },
  { midi: 59, pc: 11, sharpName: "B", flatName: "B" },
];
