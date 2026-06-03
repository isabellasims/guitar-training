import type { TrackId } from "@/lib/domain/types";

export type LevelType = "F" | "P";

/**
 * A single curriculum level. IDs use `${trackId}-${level}` (e.g. "A-7").
 * Prerequisites are all hard — see `public/rules.md`.
 */
export type Level = {
  id: string;
  trackId: TrackId;
  level: number;
  type: LevelType;
  name: string;
  prerequisiteLevelIds: string[];
};

/**
 * Tracks A–F in level order. The first level per track has no prerequisites
 * unless it cross-gates against another track.
 *
 * Curriculum invariants (see CORE RULE comment in `cardsForLevel.ts`):
 *   - Identify cards never include the tonic as an option (the drone is the
 *     tonic; identifying it is pitch-matching, not function recognition).
 *   - Major is owned fully by ear before minor enters (Phase 1 → Phase 2).
 *   - Cross-key generalization (Phase 3) only after both modes are owned.
 *   - Every few levels, a consolidation level [P] introduces no new content
 *     and pure-drills everything learned so far.
 *   - Track D (chord function) enters after full major diatonic (A-11).
 *   - Track E (intervals) enters after stable major tones (A-5) — runs
 *     parallel with degrees, not after A-11.
 *   - Track F (improvisation) enters once chord-tone recognition (A-11)
 *     plus the vi chord (D-2) are owned by ear.
 */
export const LEVELS: Level[] = [
  // ─────────────────────────────────────────────────────────────────────
  // Track A — Scale Degrees (22 levels in 3 phases)
  //   Phase 1: Major scale degrees, one at a time (A-1..A-11)
  //   Phase 2: Minor scale degrees (A-12..A-18)
  //   Phase 3: Cross-key generalization (A-19..A-22)
  // ─────────────────────────────────────────────────────────────────────
  // Phase 1 — Major
  { id: "A-1", trackId: "A", level: 1, type: "F", name: "Tonic (C major)", prerequisiteLevelIds: [] },
  { id: "A-2", trackId: "A", level: 2, type: "F", name: "The Root", prerequisiteLevelIds: ["A-1"] },
  { id: "A-3", trackId: "A", level: 3, type: "F", name: "The 5th", prerequisiteLevelIds: ["A-2"] },
  { id: "A-4", trackId: "A", level: 4, type: "F", name: "The 3rd (major)", prerequisiteLevelIds: ["A-3"] },
  { id: "A-5", trackId: "A", level: 5, type: "P", name: "Stable Tones Consolidation", prerequisiteLevelIds: ["A-4"] },
  { id: "A-6", trackId: "A", level: 6, type: "F", name: "The 7th (leading tone)", prerequisiteLevelIds: ["A-5"] },
  { id: "A-7", trackId: "A", level: 7, type: "F", name: "The 4th", prerequisiteLevelIds: ["A-6"] },
  { id: "A-8", trackId: "A", level: 8, type: "P", name: "Mid-tension Consolidation", prerequisiteLevelIds: ["A-7"] },
  { id: "A-9", trackId: "A", level: 9, type: "F", name: "The 2nd", prerequisiteLevelIds: ["A-8"] },
  { id: "A-10", trackId: "A", level: 10, type: "F", name: "The 6th", prerequisiteLevelIds: ["A-9"] },
  { id: "A-11", trackId: "A", level: 11, type: "P", name: "Full Major Diatonic", prerequisiteLevelIds: ["A-10"] },
  // Phase 2 — Minor (A-12 cross-gates on C-2 for the A minor scale shape)
  { id: "A-12", trackId: "A", level: 12, type: "F", name: "Tonic (A minor)", prerequisiteLevelIds: ["A-11"] },
  { id: "A-13", trackId: "A", level: 13, type: "P", name: "Re-orient (Root + 5th in minor)", prerequisiteLevelIds: ["A-12"] },
  { id: "A-14", trackId: "A", level: 14, type: "F", name: "The Flat 3rd", prerequisiteLevelIds: ["A-13"] },
  { id: "A-15", trackId: "A", level: 15, type: "F", name: "The Flat 7", prerequisiteLevelIds: ["A-14"] },
  { id: "A-16", trackId: "A", level: 16, type: "F", name: "The Flat 6 + 2 (in minor)", prerequisiteLevelIds: ["A-15"] },
  { id: "A-17", trackId: "A", level: 17, type: "P", name: "Full Minor Diatonic", prerequisiteLevelIds: ["A-16"] },
  { id: "A-18", trackId: "A", level: 18, type: "P", name: "Cross-mode Consolidation", prerequisiteLevelIds: ["A-17"] },
  // Phase 3 — Cross-key
  { id: "A-19", trackId: "A", level: 19, type: "F", name: "G and D major", prerequisiteLevelIds: ["A-18"] },
  { id: "A-20", trackId: "A", level: 20, type: "P", name: "All Major Keys", prerequisiteLevelIds: ["A-19"] },
  { id: "A-21", trackId: "A", level: 21, type: "F", name: "E and D minor", prerequisiteLevelIds: ["A-20"] },
  { id: "A-22", trackId: "A", level: 22, type: "P", name: "All Keys, All Modes", prerequisiteLevelIds: ["A-21"] },

  // ─────────────────────────────────────────────────────────────────────
  // Track B — Note Finding (18 levels)
  //   B-1..B-7: one string at a time (low E → A → mix → D → G → B → high e).
  //   B-8..B-14: each natural note class across all strings (circle-of-fifths).
  //   B-15..B-18: sharps/flats, full random recall, speed.
  // ─────────────────────────────────────────────────────────────────────
  { id: "B-1", trackId: "B", level: 1, type: "F", name: "Low E String", prerequisiteLevelIds: [] },
  { id: "B-2", trackId: "B", level: 2, type: "F", name: "A String", prerequisiteLevelIds: ["B-1"] },
  { id: "B-3", trackId: "B", level: 3, type: "P", name: "E + A Mix", prerequisiteLevelIds: ["B-2"] },
  { id: "B-4", trackId: "B", level: 4, type: "F", name: "D String", prerequisiteLevelIds: ["B-3"] },
  { id: "B-5", trackId: "B", level: 5, type: "P", name: "G String", prerequisiteLevelIds: ["B-4"] },
  { id: "B-6", trackId: "B", level: 6, type: "F", name: "B String (2nd)", prerequisiteLevelIds: ["B-5"] },
  { id: "B-7", trackId: "B", level: 7, type: "P", name: "High E String", prerequisiteLevelIds: ["B-6"] },
  { id: "B-8", trackId: "B", level: 8, type: "F", name: "C Note — All Strings", prerequisiteLevelIds: ["B-7"] },
  { id: "B-9", trackId: "B", level: 9, type: "P", name: "G Note — All Strings", prerequisiteLevelIds: ["B-8"] },
  { id: "B-10", trackId: "B", level: 10, type: "P", name: "D Note — All Strings", prerequisiteLevelIds: ["B-9"] },
  { id: "B-11", trackId: "B", level: 11, type: "P", name: "A Note — All Strings", prerequisiteLevelIds: ["B-10"] },
  { id: "B-12", trackId: "B", level: 12, type: "P", name: "E Note — All Strings", prerequisiteLevelIds: ["B-11"] },
  { id: "B-13", trackId: "B", level: 13, type: "P", name: "F Note — All Strings", prerequisiteLevelIds: ["B-12"] },
  { id: "B-14", trackId: "B", level: 14, type: "P", name: "B Note — All Strings", prerequisiteLevelIds: ["B-13"] },
  { id: "B-15", trackId: "B", level: 15, type: "F", name: "Sharps and Flats", prerequisiteLevelIds: ["B-14"] },
  { id: "B-16", trackId: "B", level: 16, type: "P", name: "Mixed Naturals", prerequisiteLevelIds: ["B-15"] },
  { id: "B-17", trackId: "B", level: 17, type: "P", name: "Mixed Chromatic", prerequisiteLevelIds: ["B-16"] },
  { id: "B-18", trackId: "B", level: 18, type: "P", name: "Speed (Under 2s)", prerequisiteLevelIds: ["B-17"] },

  // ─────────────────────────────────────────────────────────────────────
  // Track C — Fretboard & CAGED (14 levels, unchanged)
  // ─────────────────────────────────────────────────────────────────────
  { id: "C-1", trackId: "C", level: 1, type: "F", name: "Open C Major Scale", prerequisiteLevelIds: [] },
  { id: "C-2", trackId: "C", level: 2, type: "F", name: "Open A Minor Scale", prerequisiteLevelIds: ["C-1"] },
  { id: "C-3", trackId: "C", level: 3, type: "F", name: "Movable Major Scale (E-shape)", prerequisiteLevelIds: ["C-2"] },
  { id: "C-4", trackId: "C", level: 4, type: "F", name: "Movable Minor Scale (E-shape)", prerequisiteLevelIds: ["C-3"] },
  { id: "C-5", trackId: "C", level: 5, type: "F", name: "Minor Pentatonic Box 1", prerequisiteLevelIds: ["C-4"] },
  { id: "C-6", trackId: "C", level: 6, type: "F", name: "Box 1 — Roots", prerequisiteLevelIds: ["C-5"] },
  // Cross-gates on A-4 (The 3rd) — labels in Box 1 only make sense once
  // the user knows degree names for root/3rd/5th.
  { id: "C-7", trackId: "C", level: 7, type: "F", name: "Box 1 — All Chord Tones", prerequisiteLevelIds: ["C-6", "A-4"] },
  { id: "C-8", trackId: "C", level: 8, type: "F", name: "E-shape CAGED — Major Chord Tones", prerequisiteLevelIds: ["C-7"] },
  { id: "C-9", trackId: "C", level: 9, type: "F", name: "E-shape CAGED — Minor Chord Tones", prerequisiteLevelIds: ["C-8"] },
  { id: "C-10", trackId: "C", level: 10, type: "F", name: "Minor Pentatonic Box 2", prerequisiteLevelIds: ["C-9"] },
  { id: "C-11", trackId: "C", level: 11, type: "F", name: "Box 2 — Chord Tones", prerequisiteLevelIds: ["C-10"] },
  { id: "C-12", trackId: "C", level: 12, type: "F", name: "A-shape CAGED — Chord Tones", prerequisiteLevelIds: ["C-11"] },
  { id: "C-13", trackId: "C", level: 13, type: "F", name: "Major Scale Around A-shape", prerequisiteLevelIds: ["C-12"] },
  { id: "C-14", trackId: "C", level: 14, type: "P", name: "Connect Box 1 + Box 2", prerequisiteLevelIds: ["C-13"] },

  // ─────────────────────────────────────────────────────────────────────
  // Track D — Hearing Chord Changes (5 levels, entered when A-11 complete)
  // ─────────────────────────────────────────────────────────────────────
  { id: "D-1", trackId: "D", level: 1, type: "F", name: "I-IV-V Recognition", prerequisiteLevelIds: ["A-11"] },
  { id: "D-2", trackId: "D", level: 2, type: "F", name: "The vi Chord", prerequisiteLevelIds: ["D-1"] },
  { id: "D-3", trackId: "D", level: 3, type: "F", name: "The ii Chord", prerequisiteLevelIds: ["D-2"] },
  { id: "D-4", trackId: "D", level: 4, type: "F", name: "Minor Key Changes", prerequisiteLevelIds: ["D-3"] },
  { id: "D-5", trackId: "D", level: 5, type: "P", name: "Real Songs", prerequisiteLevelIds: ["D-4"] },

  // ─────────────────────────────────────────────────────────────────────
  // Track E — Intervals (17 levels)
  //   Phase 1 (E-1..E-8):  Ascending consonances → ascending majors
  //   Phase 2 (E-9..E-14): Ascending minors + tritone
  //   Phase 3 (E-15..E-17): Descending
  // ─────────────────────────────────────────────────────────────────────
  { id: "E-1", trackId: "E", level: 1, type: "F", name: "Perfect 5th", prerequisiteLevelIds: ["A-5"] },
  { id: "E-2", trackId: "E", level: 2, type: "F", name: "Perfect 4th", prerequisiteLevelIds: ["E-1"] },
  { id: "E-3", trackId: "E", level: 3, type: "F", name: "Major 3rd", prerequisiteLevelIds: ["E-2"] },
  { id: "E-4", trackId: "E", level: 4, type: "P", name: "P4 / P5 / M3 Consolidation", prerequisiteLevelIds: ["E-3"] },
  { id: "E-5", trackId: "E", level: 5, type: "F", name: "Major 2nd", prerequisiteLevelIds: ["E-4"] },
  { id: "E-6", trackId: "E", level: 6, type: "F", name: "Major 6th", prerequisiteLevelIds: ["E-5"] },
  { id: "E-7", trackId: "E", level: 7, type: "F", name: "Major 7th", prerequisiteLevelIds: ["E-6"] },
  { id: "E-8", trackId: "E", level: 8, type: "P", name: "Ascending Majors Consolidation", prerequisiteLevelIds: ["E-7"] },
  { id: "E-9", trackId: "E", level: 9, type: "F", name: "Minor 3rd", prerequisiteLevelIds: ["E-8"] },
  { id: "E-10", trackId: "E", level: 10, type: "F", name: "Minor 7th", prerequisiteLevelIds: ["E-9"] },
  { id: "E-11", trackId: "E", level: 11, type: "F", name: "Minor 6th", prerequisiteLevelIds: ["E-10"] },
  { id: "E-12", trackId: "E", level: 12, type: "F", name: "Minor 2nd", prerequisiteLevelIds: ["E-11"] },
  { id: "E-13", trackId: "E", level: 13, type: "F", name: "Tritone", prerequisiteLevelIds: ["E-12"] },
  { id: "E-14", trackId: "E", level: 14, type: "P", name: "All Ascending Consolidation", prerequisiteLevelIds: ["E-13"] },
  { id: "E-15", trackId: "E", level: 15, type: "F", name: "Descending — major anchors", prerequisiteLevelIds: ["E-14"] },
  { id: "E-16", trackId: "E", level: 16, type: "F", name: "Descending — remaining intervals", prerequisiteLevelIds: ["E-15"] },
  { id: "E-17", trackId: "E", level: 17, type: "P", name: "Mixed Direction Consolidation", prerequisiteLevelIds: ["E-16"] },

  // ─────────────────────────────────────────────────────────────────────
  // Track F — Improvisation (4 levels, entered when A-11 + D-2 complete)
  //   Chord-tone targeting; capstone is freeplay.
  // ─────────────────────────────────────────────────────────────────────
  { id: "F-1", trackId: "F", level: 1, type: "F", name: "Major chord tones (1, 3, 5)", prerequisiteLevelIds: ["A-11", "D-2"] },
  { id: "F-2", trackId: "F", level: 2, type: "F", name: "Minor chord tones (1, b3, 5)", prerequisiteLevelIds: ["F-1"] },
  { id: "F-3", trackId: "F", level: 3, type: "P", name: "Chord tone vs. non-chord-tone", prerequisiteLevelIds: ["F-2"] },
  { id: "F-4", trackId: "F", level: 4, type: "P", name: "Freeplay capstone", prerequisiteLevelIds: ["F-3"] },
];

export const LEVELS_BY_ID: Record<string, Level> = LEVELS.reduce(
  (acc, l) => {
    acc[l.id] = l;
    return acc;
  },
  {} as Record<string, Level>,
);

export function getLevelsForTrack(trackId: TrackId): Level[] {
  return LEVELS.filter((l) => l.trackId === trackId).sort(
    (a, b) => a.level - b.level,
  );
}

export function getLevel(levelId: string): Level | undefined {
  return LEVELS_BY_ID[levelId];
}

export function getFirstLevelId(trackId: TrackId): string {
  return getLevelsForTrack(trackId)[0]?.id ?? "";
}
