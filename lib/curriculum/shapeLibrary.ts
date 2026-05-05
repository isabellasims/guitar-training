import type { ShapeRecallStep } from "@/lib/cards/types";

/**
 * Single source of truth for all Track C shapes.
 *
 * Each entry is the canonical definition of a scale, pent box, or chord-tone
 * map: a sequence of (string, fret) tuples, plus optional metadata so the
 * Scale Library can transpose movable shapes via a tonic picker.
 *
 * The same data drives:
 *   - Curriculum cards (Track C foundations + practice)
 *   - The Scale Library (read-only, drill mode after the level is unlocked)
 *   - Comparison overlays in concept-explainers (e.g. major vs minor diff)
 */

export type ShapeCategory =
  | "Open scales"
  | "Movable scales"
  | "Pentatonic boxes"
  | "CAGED chord tones";

export type ShapeDefinition = {
  /** Stable id (e.g. "open-c-major", "movable-major-e-shape"). */
  id: string;
  /** The Track C level that introduces this shape. */
  unlockedBy: string;
  category: ShapeCategory;
  /** Display name in the Scale Library and on cards. */
  name: string;
  /** One-line description for the Scale Library catalog. */
  description: string;
  /**
   * Movable shapes can be transposed by the user via a tonic picker.
   * Open shapes are fixed in their canonical key.
   */
  transposable: boolean;
  /** Default tonic pitch class (0=C…11=B) used when first opened. */
  defaultRootPitchClass: number;
  /**
   * For transposable shapes: the string the root anchors on (0=high e, 5=low E).
   * Together with `defaultRootFret`, lets us compute fret offsets when the user
   * picks a different tonic.
   */
  rootStringIndex?: number;
  /** Fret of the root in the default key — anchor for transposition math. */
  defaultRootFret?: number;
  /** Ascending sequence the user plays. */
  steps: ShapeRecallStep[];
  /** Optional descending variant (some library entries provide both). */
  descending?: ShapeRecallStep[];
  /** Optional friendly key label for the default tonic ("C major", "A minor", "G", "G minor", "C"). */
  defaultKeyLabel: string;
};

/** All shapes referenced by Track C and the Scale Library. */
export const SHAPES: ShapeDefinition[] = [
  // ── C·1 ────────────────────────────────────────────────────
  {
    id: "open-c-major",
    unlockedBy: "C-1",
    category: "Open scales",
    name: "Open C major scale",
    description: "Open-position C major. Frets 0–3, several open strings.",
    transposable: false,
    defaultRootPitchClass: 0,
    defaultKeyLabel: "C",
    steps: [
      { stringIndex: 4, fret: 3 },
      { stringIndex: 3, fret: 0 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 3, fret: 3 },
      { stringIndex: 2, fret: 0 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 1, fret: 0 },
      { stringIndex: 1, fret: 1 },
    ],
    descending: [
      { stringIndex: 1, fret: 1 },
      { stringIndex: 1, fret: 0 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 2, fret: 0 },
      { stringIndex: 3, fret: 3 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 3, fret: 0 },
      { stringIndex: 4, fret: 3 },
    ],
  },
  // ── C·2 ────────────────────────────────────────────────────
  {
    id: "open-a-minor",
    unlockedBy: "C-2",
    category: "Open scales",
    name: "Open A minor scale",
    description: "Same notes as C major, centered on A. Open position.",
    transposable: false,
    defaultRootPitchClass: 9,
    defaultKeyLabel: "A minor",
    steps: [
      { stringIndex: 4, fret: 0 },
      { stringIndex: 4, fret: 2 },
      { stringIndex: 4, fret: 3 },
      { stringIndex: 3, fret: 0 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 3, fret: 3 },
      { stringIndex: 2, fret: 0 },
      { stringIndex: 2, fret: 2 },
    ],
    descending: [
      { stringIndex: 2, fret: 2 },
      { stringIndex: 2, fret: 0 },
      { stringIndex: 3, fret: 3 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 3, fret: 0 },
      { stringIndex: 4, fret: 3 },
      { stringIndex: 4, fret: 2 },
      { stringIndex: 4, fret: 0 },
    ],
  },
  // ── C·3 ────────────────────────────────────────────────────
  {
    id: "movable-major-e-shape",
    unlockedBy: "C-3",
    category: "Movable scales",
    name: "Movable major scale (E-shape)",
    description: "Root on the 6th string. Slide for any major key.",
    transposable: true,
    defaultRootPitchClass: 7, // G
    rootStringIndex: 5,
    defaultRootFret: 3,
    defaultKeyLabel: "G",
    steps: [
      { stringIndex: 5, fret: 3 },
      { stringIndex: 5, fret: 5 },
      { stringIndex: 5, fret: 7 },
      { stringIndex: 4, fret: 3 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 3, fret: 4 },
      { stringIndex: 3, fret: 5 },
    ],
    descending: [
      { stringIndex: 3, fret: 5 },
      { stringIndex: 3, fret: 4 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 4, fret: 3 },
      { stringIndex: 5, fret: 7 },
      { stringIndex: 5, fret: 5 },
      { stringIndex: 5, fret: 3 },
    ],
  },
  // ── C·4 ────────────────────────────────────────────────────
  {
    id: "movable-minor-e-shape",
    unlockedBy: "C-4",
    category: "Movable scales",
    name: "Movable minor scale (E-shape)",
    description:
      "Same anchor as the movable major; 3rd, 6th, 7th drop a fret.",
    transposable: true,
    defaultRootPitchClass: 9, // A
    rootStringIndex: 5,
    defaultRootFret: 5,
    defaultKeyLabel: "A minor",
    steps: [
      { stringIndex: 5, fret: 5 },
      { stringIndex: 5, fret: 7 },
      { stringIndex: 5, fret: 8 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 4, fret: 8 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 3, fret: 7 },
    ],
    descending: [
      { stringIndex: 3, fret: 7 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 4, fret: 8 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 5, fret: 8 },
      { stringIndex: 5, fret: 7 },
      { stringIndex: 5, fret: 5 },
    ],
  },
  // ── C·5 ────────────────────────────────────────────────────
  {
    id: "pent-box-1",
    unlockedBy: "C-5",
    category: "Pentatonic boxes",
    name: "Minor pentatonic Box 1",
    description: "Two notes per string. Root on the 6th string.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 5,
    defaultRootFret: 5,
    defaultKeyLabel: "A minor",
    steps: [
      { stringIndex: 5, fret: 5 },
      { stringIndex: 5, fret: 8 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 3, fret: 7 },
      { stringIndex: 2, fret: 5 },
      { stringIndex: 2, fret: 8 },
      { stringIndex: 1, fret: 5 },
      { stringIndex: 1, fret: 8 },
      { stringIndex: 0, fret: 5 },
      { stringIndex: 0, fret: 8 },
    ],
    descending: [
      { stringIndex: 0, fret: 8 },
      { stringIndex: 0, fret: 5 },
      { stringIndex: 1, fret: 8 },
      { stringIndex: 1, fret: 5 },
      { stringIndex: 2, fret: 8 },
      { stringIndex: 2, fret: 5 },
      { stringIndex: 3, fret: 7 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 5, fret: 8 },
      { stringIndex: 5, fret: 5 },
    ],
  },
  // ── C·6 ────────────────────────────────────────────────────
  {
    id: "pent-box-1-roots",
    unlockedBy: "C-6",
    category: "Pentatonic boxes",
    name: "Box 1 — roots only",
    description: "The three A's inside Box 1, low to high.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 5,
    defaultRootFret: 5,
    defaultKeyLabel: "A minor",
    steps: [
      { stringIndex: 5, fret: 5 },
      { stringIndex: 3, fret: 7 },
      { stringIndex: 0, fret: 5 },
    ],
  },
  // ── C·7 ────────────────────────────────────────────────────
  {
    id: "pent-box-1-chord-tones",
    unlockedBy: "C-7",
    category: "Pentatonic boxes",
    name: "Box 1 — all chord tones",
    description: "Roots, flat 3rds, 5ths inside Box 1.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 5,
    defaultRootFret: 5,
    defaultKeyLabel: "A minor",
    steps: [
      { stringIndex: 5, fret: 5 },
      { stringIndex: 3, fret: 7 },
      { stringIndex: 0, fret: 5 },
      { stringIndex: 5, fret: 8 },
      { stringIndex: 2, fret: 5 },
      { stringIndex: 0, fret: 8 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 1, fret: 7 },
    ],
  },
  // ── C·8 ────────────────────────────────────────────────────
  {
    id: "caged-e-major",
    unlockedBy: "C-8",
    category: "CAGED chord tones",
    name: "E-shape CAGED — major chord tones",
    description: "G major in E-shape barre at the 3rd fret.",
    transposable: true,
    defaultRootPitchClass: 7,
    rootStringIndex: 5,
    defaultRootFret: 3,
    defaultKeyLabel: "G",
    steps: [
      { stringIndex: 5, fret: 3 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 2, fret: 4 },
      { stringIndex: 1, fret: 3 },
      { stringIndex: 0, fret: 3 },
    ],
  },
  // ── C·9 ────────────────────────────────────────────────────
  {
    id: "caged-e-minor",
    unlockedBy: "C-9",
    category: "CAGED chord tones",
    name: "E-shape CAGED — minor chord tones",
    description: "Same shape; flatten the 3rd. G minor at the 3rd fret.",
    transposable: true,
    defaultRootPitchClass: 7,
    rootStringIndex: 5,
    defaultRootFret: 3,
    defaultKeyLabel: "G minor",
    steps: [
      { stringIndex: 5, fret: 3 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 2, fret: 3 },
      { stringIndex: 1, fret: 3 },
      { stringIndex: 0, fret: 3 },
    ],
  },
  // ── C·10 ───────────────────────────────────────────────────
  {
    id: "pent-box-2",
    unlockedBy: "C-10",
    category: "Pentatonic boxes",
    name: "Minor pentatonic Box 2",
    description: "Two notes per string. Lowest note is C (flat 3) at fret 8.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 4,
    defaultRootFret: 7,
    defaultKeyLabel: "A minor",
    steps: [
      { stringIndex: 5, fret: 8 },
      { stringIndex: 5, fret: 10 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 4, fret: 10 },
      { stringIndex: 3, fret: 7 },
      { stringIndex: 3, fret: 9 },
      { stringIndex: 2, fret: 8 },
      { stringIndex: 2, fret: 10 },
      { stringIndex: 1, fret: 8 },
      { stringIndex: 1, fret: 10 },
      { stringIndex: 0, fret: 8 },
      { stringIndex: 0, fret: 10 },
    ],
    descending: [
      { stringIndex: 0, fret: 10 },
      { stringIndex: 0, fret: 8 },
      { stringIndex: 1, fret: 10 },
      { stringIndex: 1, fret: 8 },
      { stringIndex: 2, fret: 10 },
      { stringIndex: 2, fret: 8 },
      { stringIndex: 3, fret: 9 },
      { stringIndex: 3, fret: 7 },
      { stringIndex: 4, fret: 10 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 5, fret: 10 },
      { stringIndex: 5, fret: 8 },
    ],
  },
  // ── C·11 ───────────────────────────────────────────────────
  {
    id: "pent-box-2-chord-tones",
    unlockedBy: "C-11",
    category: "Pentatonic boxes",
    name: "Box 2 — chord tones",
    description: "Roots, flat 3rds, 5ths inside Box 2.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 3,
    defaultRootFret: 7,
    defaultKeyLabel: "A minor",
    steps: [
      { stringIndex: 3, fret: 7 },
      { stringIndex: 1, fret: 10 },
      { stringIndex: 5, fret: 8 },
      { stringIndex: 3, fret: 10 },
      { stringIndex: 0, fret: 8 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 2, fret: 9 },
    ],
  },
  // ── C·12 ───────────────────────────────────────────────────
  {
    id: "caged-a-major",
    unlockedBy: "C-12",
    category: "CAGED chord tones",
    name: "A-shape CAGED — chord tones",
    description: "C major in A-shape barre at the 3rd fret.",
    transposable: true,
    defaultRootPitchClass: 0,
    rootStringIndex: 4,
    defaultRootFret: 3,
    defaultKeyLabel: "C",
    steps: [
      { stringIndex: 4, fret: 3 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 2, fret: 5 },
      { stringIndex: 1, fret: 5 },
    ],
  },
  // ── C·13 ───────────────────────────────────────────────────
  {
    id: "movable-major-a-shape",
    unlockedBy: "C-13",
    category: "Movable scales",
    name: "Major scale around the A-shape",
    description: "Root on the 5th string. C major at the 3rd fret.",
    transposable: true,
    defaultRootPitchClass: 0,
    rootStringIndex: 4,
    defaultRootFret: 3,
    defaultKeyLabel: "C",
    steps: [
      { stringIndex: 4, fret: 3 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 3, fret: 3 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 2, fret: 4 },
      { stringIndex: 2, fret: 5 },
    ],
    descending: [
      { stringIndex: 2, fret: 5 },
      { stringIndex: 2, fret: 4 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 3, fret: 5 },
      { stringIndex: 3, fret: 3 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 4, fret: 3 },
    ],
  },
  // ── C·14 ───────────────────────────────────────────────────
  {
    id: "connect-box-1-2",
    unlockedBy: "C-14",
    category: "Pentatonic boxes",
    name: "Connect Box 1 + Box 2",
    description: "13-note pentatonic run spanning both boxes.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 5,
    defaultRootFret: 5,
    defaultKeyLabel: "A minor",
    steps: [
      { stringIndex: 5, fret: 5 },
      { stringIndex: 5, fret: 8 },
      { stringIndex: 4, fret: 5 },
      { stringIndex: 4, fret: 7 },
      { stringIndex: 4, fret: 10 },
      { stringIndex: 3, fret: 7 },
      { stringIndex: 3, fret: 10 },
      { stringIndex: 2, fret: 7 },
      { stringIndex: 2, fret: 9 },
      { stringIndex: 1, fret: 8 },
      { stringIndex: 1, fret: 10 },
      { stringIndex: 0, fret: 8 },
      { stringIndex: 0, fret: 10 },
    ],
  },
];

export const SHAPES_BY_ID: Record<string, ShapeDefinition> = SHAPES.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, ShapeDefinition>,
);

/**
 * Transpose a sequence of (string, fret) steps by N semitones along each
 * string. If the result would land on a negative fret, shift everything up an
 * octave (12 frets). If it would exceed fret 17, shift down. The shape is
 * conceptually moved to a new key while keeping the same fingering.
 */
export function transposeSteps(
  steps: ShapeRecallStep[],
  semitoneOffset: number,
): ShapeRecallStep[] {
  if (semitoneOffset === 0) return steps.map((s) => ({ ...s }));
  const shifted = steps.map((s) => ({
    stringIndex: s.stringIndex,
    fret: s.fret + semitoneOffset,
  }));
  const minFret = shifted.reduce((m, s) => Math.min(m, s.fret), 0);
  if (minFret < 0) {
    return shifted.map((s) => ({ ...s, fret: s.fret + 12 }));
  }
  const maxFret = shifted.reduce((m, s) => Math.max(m, s.fret), 0);
  if (maxFret > 17) {
    return shifted.map((s) => ({ ...s, fret: s.fret - 12 }));
  }
  return shifted;
}

/**
 * Compute the semitone offset from a shape's default tonic to the user's
 * chosen pitch class (0–11). Always picks the nearest offset, preferring the
 * positive direction so transposed shapes drift up the neck rather than off
 * the bottom.
 */
export function semitoneOffsetForPitchClass(
  shape: ShapeDefinition,
  newPitchClass: number,
): number {
  const delta = ((newPitchClass - shape.defaultRootPitchClass) % 12 + 12) % 12;
  // delta is 0..11. Use positive offset (slide up the neck).
  return delta;
}
