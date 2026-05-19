import type { ShapeRecallStep } from "@/lib/cards/types";
import { STANDARD_OPEN_MIDI, type StringIndex } from "@/lib/fretboard/model";

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
 *
 * Two encoding flavors:
 *   - **Absolute**: `steps` is a list of explicit (stringIndex, fret) tuples.
 *     Used for non-transposable open shapes and legacy shapes.
 *   - **Pattern**: `pattern` is a list of (stringIndex, offset, finger,
 *     degree) tuples relative to an anchor fret. The anchor moves when the
 *     user picks a new tonic — the fingering and degree labels stay
 *     identical across keys, which is the entire pedagogical point of
 *     movable shapes. `steps` and `descending` are populated automatically
 *     from the pattern at the default tonic so existing consumers keep
 *     working without changes.
 */

export type ShapeCategory =
  | "Open scales"
  | "Movable scales"
  | "Pentatonic boxes"
  | "CAGED chord tones";

/** A single position in a transposable pattern. */
export type ShapePatternNote = {
  stringIndex: StringIndex;
  /** Fret offset from the anchor fret. */
  offset: number;
  finger: 1 | 2 | 3 | 4;
  /** Scale-degree label ("1", "2", "b3", "3", "4", "5", "b6", "6", "b7", "7"). */
  degree: string;
};

/**
 * A pattern that travels with the shape regardless of key. Resolve to
 * concrete steps via `resolvePatternToSteps(pattern, tonicPc)`.
 */
export type ShapePattern = {
  /** The string the root anchors on (0=high e..5=low E). */
  rootStringIndex: StringIndex;
  /**
   * Anchor fret = root fret on `rootStringIndex` + `anchorOffsetFromRoot`.
   * For the standard E-shape major scale, the root sits on finger 2 and
   * the anchor (finger 1) sits one fret lower, so this is -1.
   */
  anchorOffsetFromRoot: number;
  /** Notes in canonical ascending playing order. */
  ascending: ShapePatternNote[];
};

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
  /**
   * Ascending sequence the user plays. For pattern-based shapes this is
   * auto-populated from the pattern resolved at the default tonic.
   */
  steps: ShapeRecallStep[];
  /**
   * Optional descending variant. For pattern-based shapes this is the
   * reverse of `steps` (auto-populated).
   */
  descending?: ShapeRecallStep[];
  /** Optional friendly key label for the default tonic ("C major", "A minor", "G", "G minor", "C"). */
  defaultKeyLabel: string;
  /**
   * If present, the canonical fingering pattern. Lets the Scale Library
   * tonic picker re-resolve the shape to any key while preserving the
   * fingering and degree labels.
   */
  pattern?: ShapePattern;
  /**
   * When true, the shape only appears in the Scale Library — it is never
   * referenced by a curriculum card. Useful for keeping legacy/alternate
   * fingerings drillable without cluttering the Track C lesson plan.
   */
  libraryOnly?: boolean;
  /**
   * When true, the shape is only used by curriculum cards — it is hidden
   * from the Scale Library catalog. Used for subset drills (e.g. "roots
   * only", "chord tones only") that are meaningful inside a lesson but
   * would just look like duplicates of the full shape if listed in the
   * library, since the user can drill the full shape and switch the
   * label toggle to "Degrees" to focus on chord tones.
   */
  curriculumOnly?: boolean;
};

/**
 * Resolve a pattern to a concrete list of steps (with finger + degree
 * metadata) for a given tonic pitch class. Always picks the lowest fret
 * position that keeps every note at fret >= 0; if a key (e.g. F) would
 * push the anchor below open, the whole shape shifts up an octave so it
 * stays playable.
 */
export function resolvePatternToSteps(
  pattern: ShapePattern,
  tonicPitchClass: number,
): ShapeRecallStep[] {
  const openMidi = STANDARD_OPEN_MIDI[pattern.rootStringIndex] ?? 0;
  let rootFret = (((tonicPitchClass - openMidi) % 12) + 12) % 12;
  const minOffset = pattern.ascending.reduce(
    (m, n) => Math.min(m, n.offset),
    0,
  );
  // Bump up an octave if the anchor would land below the nut.
  while (rootFret + pattern.anchorOffsetFromRoot + minOffset < 0) {
    rootFret += 12;
  }
  const anchor = rootFret + pattern.anchorOffsetFromRoot;
  return pattern.ascending.map((n) => ({
    stringIndex: n.stringIndex,
    fret: anchor + n.offset,
    finger: n.finger,
    degree: n.degree,
  }));
}

/**
 * Standard Position 1 major scale (E-shape). 15 notes, two octaves,
 * ascending. The root sits at finger 2 on the 6th string; finger 1
 * anchors one fret below the root. Slide the same pattern up or down
 * the neck for any major key.
 *
 * Fingering (1=index, 2=middle, 3=ring, 4=pinky):
 *   6th string: 2, 4
 *   5th string: 1, 2, 4
 *   4th string: 1, 3, 4
 *   3rd string: 1, 3, 4
 *   2nd string: 2, 4
 *   1st string: 1, 2
 *
 * Verify in G (root fret 3 on low E): produces frets
 *   6th: 3, 5    5th: 2, 3, 5    4th: 2, 4, 5
 *   3rd: 2, 4, 5    2nd: 3, 5    1st: 2, 3
 * which sounds the 15-note ascending G major scale across two octaves.
 */
const MAJOR_E_SHAPE_PATTERN: ShapePattern = {
  rootStringIndex: 5,
  anchorOffsetFromRoot: -1,
  ascending: [
    { stringIndex: 5, offset: 1, finger: 2, degree: "1" },
    { stringIndex: 5, offset: 3, finger: 4, degree: "2" },
    { stringIndex: 4, offset: 0, finger: 1, degree: "3" },
    { stringIndex: 4, offset: 1, finger: 2, degree: "4" },
    { stringIndex: 4, offset: 3, finger: 4, degree: "5" },
    { stringIndex: 3, offset: 0, finger: 1, degree: "6" },
    { stringIndex: 3, offset: 2, finger: 3, degree: "7" },
    { stringIndex: 3, offset: 3, finger: 4, degree: "1" },
    { stringIndex: 2, offset: 0, finger: 1, degree: "2" },
    { stringIndex: 2, offset: 2, finger: 3, degree: "3" },
    { stringIndex: 2, offset: 3, finger: 4, degree: "4" },
    { stringIndex: 1, offset: 1, finger: 2, degree: "5" },
    { stringIndex: 1, offset: 3, finger: 4, degree: "6" },
    { stringIndex: 0, offset: 0, finger: 1, degree: "7" },
    { stringIndex: 0, offset: 1, finger: 2, degree: "1" },
  ],
};

/** Helper: build the full {steps, descending} from a pattern + default tonic. */
function patternResolved(pattern: ShapePattern, defaultTonicPc: number) {
  const steps = resolvePatternToSteps(pattern, defaultTonicPc);
  const descending = [...steps].reverse();
  return { steps, descending };
}

/**
 * Minor pentatonic Box 1. 12 notes, two per string, root on the 6th string.
 * Anchor sits on the root fret. The same fingering (1, 4 on outer strings;
 * 1, 3 on the middle four) works in every key.
 *
 * Verify in A minor (root fret 5 on low E): produces frets
 *   6th: 5, 8    5th: 5, 7    4th: 5, 7
 *   3rd: 5, 7    2nd: 5, 8    1st: 5, 8
 */
const PENT_BOX_1_PATTERN: ShapePattern = {
  rootStringIndex: 5,
  anchorOffsetFromRoot: 0,
  ascending: [
    { stringIndex: 5, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 5, offset: 3, finger: 4, degree: "b3" },
    { stringIndex: 4, offset: 0, finger: 1, degree: "4" },
    { stringIndex: 4, offset: 2, finger: 3, degree: "5" },
    { stringIndex: 3, offset: 0, finger: 1, degree: "b7" },
    { stringIndex: 3, offset: 2, finger: 3, degree: "1" },
    { stringIndex: 2, offset: 0, finger: 1, degree: "b3" },
    { stringIndex: 2, offset: 2, finger: 3, degree: "4" },
    { stringIndex: 1, offset: 0, finger: 1, degree: "5" },
    { stringIndex: 1, offset: 3, finger: 4, degree: "b7" },
    { stringIndex: 0, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 0, offset: 3, finger: 4, degree: "b3" },
  ],
};

/** Box 1 — three roots only, low to high. Subset of PENT_BOX_1_PATTERN. */
const PENT_BOX_1_ROOTS_PATTERN: ShapePattern = {
  rootStringIndex: 5,
  anchorOffsetFromRoot: 0,
  ascending: [
    { stringIndex: 5, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 3, offset: 2, finger: 3, degree: "1" },
    { stringIndex: 0, offset: 0, finger: 1, degree: "1" },
  ],
};

/**
 * Box 1 — all chord tones (roots, b3rds, 5ths). Order: roots, then b3rds,
 * then 5ths.
 *
 * Note: a previous version of this shape listed a position at (B string,
 * +2 from anchor) as a "5th" — that resolves to F# in A, which isn't the
 * 5th and isn't even in the pentatonic. Corrected to (B string, +0 from
 * anchor), which is the actual 5th (E in A) on that string within Box 1.
 */
const PENT_BOX_1_CHORD_TONES_PATTERN: ShapePattern = {
  rootStringIndex: 5,
  anchorOffsetFromRoot: 0,
  ascending: [
    { stringIndex: 5, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 3, offset: 2, finger: 3, degree: "1" },
    { stringIndex: 0, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 5, offset: 3, finger: 4, degree: "b3" },
    { stringIndex: 2, offset: 0, finger: 1, degree: "b3" },
    { stringIndex: 0, offset: 3, finger: 4, degree: "b3" },
    { stringIndex: 4, offset: 2, finger: 3, degree: "5" },
    { stringIndex: 1, offset: 0, finger: 1, degree: "5" },
  ],
};

/**
 * Minor pentatonic Box 2. Lowest note is the b3 (on the 6th string,
 * one fret above the anchor). The root sits on the 4th string at the
 * anchor fret — finger 1 plants there for the whole shape.
 *
 * Verify in A minor (root fret 7 on D string): produces frets
 *   6th: 8, 10    5th: 7, 10    4th: 7, 10
 *   3rd: 7, 9     2nd: 8, 10    1st: 8, 10
 *
 * Note: the previous absolute encoding of this shape had the D-string
 * and G-string positions swapped, producing notes outside the pentatonic
 * (B on the D string and D#/F on the G string). Corrected here.
 */
const PENT_BOX_2_PATTERN: ShapePattern = {
  rootStringIndex: 3,
  anchorOffsetFromRoot: 0,
  ascending: [
    { stringIndex: 5, offset: 1, finger: 2, degree: "b3" },
    { stringIndex: 5, offset: 3, finger: 4, degree: "4" },
    { stringIndex: 4, offset: 0, finger: 1, degree: "5" },
    { stringIndex: 4, offset: 3, finger: 4, degree: "b7" },
    { stringIndex: 3, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 3, offset: 3, finger: 4, degree: "b3" },
    { stringIndex: 2, offset: 0, finger: 1, degree: "4" },
    { stringIndex: 2, offset: 2, finger: 3, degree: "5" },
    { stringIndex: 1, offset: 1, finger: 2, degree: "b7" },
    { stringIndex: 1, offset: 3, finger: 4, degree: "1" },
    { stringIndex: 0, offset: 1, finger: 2, degree: "b3" },
    { stringIndex: 0, offset: 3, finger: 4, degree: "4" },
  ],
};

/**
 * Minor pentatonic Box 3. Starts on the 4 (D in A minor) on the 6th string;
 * the 2nd-string root sits at the anchor (one fret above the leftmost cell).
 * The 3rd string drops back one fret (the "Box 3 stretch back") and the
 * 2nd string reaches forward one fret to the b3.
 *
 * Verify in A minor (root fret 10 on B string, anchor at fret 9):
 *   6th: 10, 12    5th: 10, 12    4th: 10, 12
 *   3rd: 9, 12     2nd: 10, 13    1st: 10, 12
 */
const PENT_BOX_3_PATTERN: ShapePattern = {
  rootStringIndex: 1, // B string root
  anchorOffsetFromRoot: -1,
  ascending: [
    { stringIndex: 5, offset: 1, finger: 1, degree: "4" },
    { stringIndex: 5, offset: 3, finger: 3, degree: "5" },
    { stringIndex: 4, offset: 1, finger: 1, degree: "b7" },
    { stringIndex: 4, offset: 3, finger: 3, degree: "1" },
    { stringIndex: 3, offset: 1, finger: 1, degree: "b3" },
    { stringIndex: 3, offset: 3, finger: 3, degree: "4" },
    { stringIndex: 2, offset: 0, finger: 1, degree: "5" },
    { stringIndex: 2, offset: 3, finger: 4, degree: "b7" },
    { stringIndex: 1, offset: 1, finger: 1, degree: "1" },
    { stringIndex: 1, offset: 4, finger: 4, degree: "b3" },
    { stringIndex: 0, offset: 1, finger: 1, degree: "4" },
    { stringIndex: 0, offset: 3, finger: 3, degree: "5" },
  ],
};

/**
 * Minor pentatonic Box 4. CAGED-G-shape territory: the 5th-string root
 * lives at the anchor, with the b3 sitting up at offset +3. The 4th and
 * 3rd strings are tighter (two-fret stretches) than the outer strings.
 *
 * Verify in A minor (root fret 12 on A string):
 *   6th: 12, 15    5th: 12, 15    4th: 12, 14
 *   3rd: 12, 14    2nd: 13, 15    1st: 12, 15
 */
const PENT_BOX_4_PATTERN: ShapePattern = {
  rootStringIndex: 4, // A string root
  anchorOffsetFromRoot: 0,
  ascending: [
    { stringIndex: 5, offset: 0, finger: 1, degree: "5" },
    { stringIndex: 5, offset: 3, finger: 4, degree: "b7" },
    { stringIndex: 4, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 4, offset: 3, finger: 4, degree: "b3" },
    { stringIndex: 3, offset: 0, finger: 1, degree: "4" },
    { stringIndex: 3, offset: 2, finger: 3, degree: "5" },
    { stringIndex: 2, offset: 0, finger: 1, degree: "b7" },
    { stringIndex: 2, offset: 2, finger: 3, degree: "1" },
    { stringIndex: 1, offset: 1, finger: 1, degree: "b3" },
    { stringIndex: 1, offset: 3, finger: 3, degree: "4" },
    { stringIndex: 0, offset: 0, finger: 1, degree: "5" },
    { stringIndex: 0, offset: 3, finger: 4, degree: "b7" },
  ],
};

/**
 * Minor pentatonic Box 5. The "high" box right before Box 1 repeats an
 * octave up. Root sits on the 3rd string at the anchor and on the 6th /
 * 1st strings two frets above.
 *
 * Verify in A minor (root fret 14 on G string):
 *   6th: 15, 17    5th: 15, 17    4th: 14, 17
 *   3rd: 14, 17    2nd: 15, 17    1st: 15, 17
 */
const PENT_BOX_5_PATTERN: ShapePattern = {
  rootStringIndex: 2, // G string root
  anchorOffsetFromRoot: 0,
  ascending: [
    { stringIndex: 5, offset: 1, finger: 1, degree: "b7" },
    { stringIndex: 5, offset: 3, finger: 4, degree: "1" },
    { stringIndex: 4, offset: 1, finger: 1, degree: "b3" },
    { stringIndex: 4, offset: 3, finger: 4, degree: "4" },
    { stringIndex: 3, offset: 0, finger: 1, degree: "5" },
    { stringIndex: 3, offset: 3, finger: 4, degree: "b7" },
    { stringIndex: 2, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 2, offset: 3, finger: 4, degree: "b3" },
    { stringIndex: 1, offset: 1, finger: 1, degree: "4" },
    { stringIndex: 1, offset: 3, finger: 3, degree: "5" },
    { stringIndex: 0, offset: 1, finger: 1, degree: "b7" },
    { stringIndex: 0, offset: 3, finger: 4, degree: "1" },
  ],
};

/** Box 2 — chord tones only. Order: roots, then b3rds, then 5ths. */
const PENT_BOX_2_CHORD_TONES_PATTERN: ShapePattern = {
  rootStringIndex: 3,
  anchorOffsetFromRoot: 0,
  ascending: [
    { stringIndex: 3, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 1, offset: 3, finger: 4, degree: "1" },
    { stringIndex: 5, offset: 1, finger: 2, degree: "b3" },
    { stringIndex: 3, offset: 3, finger: 4, degree: "b3" },
    { stringIndex: 0, offset: 1, finger: 2, degree: "b3" },
    { stringIndex: 4, offset: 0, finger: 1, degree: "5" },
    { stringIndex: 2, offset: 2, finger: 3, degree: "5" },
  ],
};

/**
 * Connect Box 1 → Box 2. 13-note pentatonic run that starts at the Box 1
 * root and walks up the neck through Box 2 territory. Anchor sits on the
 * Box 1 root fret; offsets reach +5 in the Box 2 zone, requiring a
 * position shift the user manages by hand.
 */
const CONNECT_BOX_1_2_PATTERN: ShapePattern = {
  rootStringIndex: 5,
  anchorOffsetFromRoot: 0,
  ascending: [
    { stringIndex: 5, offset: 0, finger: 1, degree: "1" },
    { stringIndex: 5, offset: 3, finger: 4, degree: "b3" },
    { stringIndex: 4, offset: 0, finger: 1, degree: "4" },
    { stringIndex: 4, offset: 2, finger: 3, degree: "5" },
    { stringIndex: 4, offset: 5, finger: 4, degree: "b7" },
    { stringIndex: 3, offset: 2, finger: 3, degree: "1" },
    { stringIndex: 3, offset: 5, finger: 4, degree: "b3" },
    { stringIndex: 2, offset: 2, finger: 3, degree: "4" },
    { stringIndex: 2, offset: 4, finger: 4, degree: "5" },
    { stringIndex: 1, offset: 3, finger: 4, degree: "b7" },
    { stringIndex: 1, offset: 5, finger: 4, degree: "1" },
    { stringIndex: 0, offset: 3, finger: 4, degree: "b3" },
    { stringIndex: 0, offset: 5, finger: 4, degree: "4" },
  ],
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
  // Standard Position 1 major scale: 15 notes, two octaves, root on
  // finger 2 of the 6th string. The pattern (fingering + scale degrees)
  // is invariant across keys; only the anchor fret moves.
  {
    id: "movable-major-e-shape",
    unlockedBy: "C-3",
    category: "Movable scales",
    name: "Movable major scale (E-shape)",
    description:
      "Two-octave Position 1 major scale. 15 notes, four-finger fingering, slides to any major key.",
    transposable: true,
    defaultRootPitchClass: 7, // G
    rootStringIndex: 5,
    defaultRootFret: 3,
    defaultKeyLabel: "G",
    pattern: MAJOR_E_SHAPE_PATTERN,
    ...patternResolved(MAJOR_E_SHAPE_PATTERN, 7),
  },
  // Legacy 1-octave 3-finger fingering preserved for the Scale Library
  // only. Curriculum cards no longer reference this shape — Track C·3
  // teaches the standard Position 1 (15-note) major scale above.
  {
    id: "movable-major-e-shape-1-octave",
    unlockedBy: "C-3",
    category: "Movable scales",
    name: "Movable major scale (E-shape, 1 octave)",
    description:
      "Compact one-octave variant — 8 notes, three-finger fingering on the bottom three strings.",
    transposable: true,
    defaultRootPitchClass: 7,
    rootStringIndex: 5,
    defaultRootFret: 3,
    defaultKeyLabel: "G",
    libraryOnly: true,
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
    pattern: PENT_BOX_1_PATTERN,
    ...patternResolved(PENT_BOX_1_PATTERN, 9),
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
    curriculumOnly: true,
    pattern: PENT_BOX_1_ROOTS_PATTERN,
    ...patternResolved(PENT_BOX_1_ROOTS_PATTERN, 9),
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
    curriculumOnly: true,
    pattern: PENT_BOX_1_CHORD_TONES_PATTERN,
    ...patternResolved(PENT_BOX_1_CHORD_TONES_PATTERN, 9),
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
    description:
      "Starts on the b3 of Box 1 (the second note you play in Box 1) and lives three frets higher up the neck. Learning it lets you stay in the same key when a phrase wanders past Box 1 instead of running out of fretboard.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 3,
    defaultRootFret: 7,
    defaultKeyLabel: "A minor",
    pattern: PENT_BOX_2_PATTERN,
    ...patternResolved(PENT_BOX_2_PATTERN, 9),
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
    curriculumOnly: true,
    pattern: PENT_BOX_2_CHORD_TONES_PATTERN,
    ...patternResolved(PENT_BOX_2_CHORD_TONES_PATTERN, 9),
  },
  // ── Library: pent box 3 ────────────────────────────────────
  // Not yet wired into curriculum — drillable from the Scale Library
  // so users who finish Box 1 + 2 can keep going up the neck.
  {
    id: "pent-box-3",
    unlockedBy: "C-14",
    category: "Pentatonic boxes",
    name: "Minor pentatonic Box 3",
    description:
      "Starts on the 4 (D in A minor) on the 6th string. Index finger anchors one fret below the 2nd-string root. Bridges Box 2 to the higher reaches of the neck.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 1,
    defaultRootFret: 10,
    defaultKeyLabel: "A minor",
    pattern: PENT_BOX_3_PATTERN,
    ...patternResolved(PENT_BOX_3_PATTERN, 9),
  },
  // ── Library: pent box 4 ────────────────────────────────────
  {
    id: "pent-box-4",
    unlockedBy: "C-14",
    category: "Pentatonic boxes",
    name: "Minor pentatonic Box 4",
    description:
      "CAGED-G shape territory. 5th-string root at the anchor; covers frets 12–15 in A minor.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 4,
    defaultRootFret: 12,
    defaultKeyLabel: "A minor",
    pattern: PENT_BOX_4_PATTERN,
    ...patternResolved(PENT_BOX_4_PATTERN, 9),
  },
  // ── Library: pent box 5 ────────────────────────────────────
  {
    id: "pent-box-5",
    unlockedBy: "C-14",
    category: "Pentatonic boxes",
    name: "Minor pentatonic Box 5",
    description:
      "The highest box before Box 1 repeats an octave up. 3rd-string root at the anchor; the 6th and 1st strings each carry the root two frets above.",
    transposable: true,
    defaultRootPitchClass: 9,
    rootStringIndex: 2,
    defaultRootFret: 14,
    defaultKeyLabel: "A minor",
    pattern: PENT_BOX_5_PATTERN,
    ...patternResolved(PENT_BOX_5_PATTERN, 9),
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
    pattern: CONNECT_BOX_1_2_PATTERN,
    ...patternResolved(CONNECT_BOX_1_2_PATTERN, 9),
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
