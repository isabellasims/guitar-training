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

/** Tracks A–E in level order. The first item per track has no prerequisites. */
export const LEVELS: Level[] = [
  // Track A — Scale Degrees
  { id: "A-1", trackId: "A", level: 1, type: "F", name: "Tonic (C major)", prerequisiteLevelIds: [] },
  { id: "A-2", trackId: "A", level: 2, type: "F", name: "Tonic (A minor)", prerequisiteLevelIds: ["A-1", "C-2"] },
  { id: "A-3", trackId: "A", level: 3, type: "F", name: "The Root", prerequisiteLevelIds: ["A-2"] },
  { id: "A-4", trackId: "A", level: 4, type: "F", name: "The 5th", prerequisiteLevelIds: ["A-3"] },
  { id: "A-5", trackId: "A", level: 5, type: "F", name: "The 3rd", prerequisiteLevelIds: ["A-4"] },
  { id: "A-6", trackId: "A", level: 6, type: "P", name: "Stable Tones (minor)", prerequisiteLevelIds: ["A-5"] },
  { id: "A-7", trackId: "A", level: 7, type: "F", name: "The 7th", prerequisiteLevelIds: ["A-6"] },
  { id: "A-8", trackId: "A", level: 8, type: "F", name: "The 4th", prerequisiteLevelIds: ["A-7"] },
  { id: "A-9", trackId: "A", level: 9, type: "F", name: "The 2nd", prerequisiteLevelIds: ["A-8"] },
  { id: "A-10", trackId: "A", level: 10, type: "F", name: "The 6th", prerequisiteLevelIds: ["A-9"] },
  { id: "A-11", trackId: "A", level: 11, type: "F", name: "Chord Tones Only", prerequisiteLevelIds: ["A-10"] },
  { id: "A-12", trackId: "A", level: 12, type: "F", name: "Add the Flat 7", prerequisiteLevelIds: ["A-11"] },
  { id: "A-13", trackId: "A", level: 13, type: "P", name: "Pentatonic with Targets", prerequisiteLevelIds: ["A-12", "C-5"] },
  { id: "A-14", trackId: "A", level: 14, type: "P", name: "Two-Chord Vamp", prerequisiteLevelIds: ["A-13"] },
  { id: "A-15", trackId: "A", level: 15, type: "P", name: "Real Progression", prerequisiteLevelIds: ["A-14", "D-3"] },
  { id: "A-16", trackId: "A", level: 16, type: "P", name: "Mixed-Key Recognition", prerequisiteLevelIds: ["A-15"] },

  // Track B — Note Finding
  { id: "B-1", trackId: "B", level: 1, type: "F", name: "E String", prerequisiteLevelIds: [] },
  { id: "B-2", trackId: "B", level: 2, type: "P", name: "E + A Random", prerequisiteLevelIds: ["B-1"] },
  { id: "B-3", trackId: "B", level: 3, type: "F", name: "+ C Across Strings", prerequisiteLevelIds: ["B-2"] },
  { id: "B-4", trackId: "B", level: 4, type: "P", name: "+ F", prerequisiteLevelIds: ["B-3"] },
  { id: "B-5", trackId: "B", level: 5, type: "P", name: "+ G", prerequisiteLevelIds: ["B-4"] },
  { id: "B-6", trackId: "B", level: 6, type: "P", name: "+ D and A", prerequisiteLevelIds: ["B-5"] },
  { id: "B-7", trackId: "B", level: 7, type: "P", name: "+ B and F#", prerequisiteLevelIds: ["B-6"] },
  { id: "B-8", trackId: "B", level: 8, type: "P", name: "Full Chromatic", prerequisiteLevelIds: ["B-7"] },
  { id: "B-9", trackId: "B", level: 9, type: "P", name: "Full Fretboard Recall", prerequisiteLevelIds: ["B-8"] },
  { id: "B-10", trackId: "B", level: 10, type: "P", name: "Speed (Under 2s)", prerequisiteLevelIds: ["B-9"] },

  // Track C — Fretboard & CAGED
  { id: "C-1", trackId: "C", level: 1, type: "F", name: "A Natural Minor (1 Octave)", prerequisiteLevelIds: [] },
  { id: "C-2", trackId: "C", level: 2, type: "P", name: "A Natural Minor Solid", prerequisiteLevelIds: ["C-1"] },
  { id: "C-3", trackId: "C", level: 3, type: "F", name: "Pentatonic Box 1", prerequisiteLevelIds: ["C-2"] },
  { id: "C-4", trackId: "C", level: 4, type: "F", name: "Box 1 — Roots", prerequisiteLevelIds: ["C-3"] },
  { id: "C-5", trackId: "C", level: 5, type: "F", name: "Box 1 — All Chord Tones", prerequisiteLevelIds: ["C-4", "A-5"] },
  { id: "C-6", trackId: "C", level: 6, type: "F", name: "E-Shape CAGED (Major)", prerequisiteLevelIds: ["C-5"] },
  { id: "C-7", trackId: "C", level: 7, type: "F", name: "E-Shape CAGED (Minor)", prerequisiteLevelIds: ["C-6"] },
  { id: "C-8", trackId: "C", level: 8, type: "F", name: "Pentatonic Box 2", prerequisiteLevelIds: ["C-7"] },
  { id: "C-9", trackId: "C", level: 9, type: "F", name: "Box 2 — Chord Tones", prerequisiteLevelIds: ["C-8"] },
  { id: "C-10", trackId: "C", level: 10, type: "F", name: "A-Shape CAGED", prerequisiteLevelIds: ["C-9"] },
  { id: "C-11", trackId: "C", level: 11, type: "P", name: "Connect Box 1 + 2", prerequisiteLevelIds: ["C-10"] },
  { id: "C-12", trackId: "C", level: 12, type: "F", name: "D-Shape + Third Box", prerequisiteLevelIds: ["C-11"] },

  // Track D — Hearing Chord Changes (entered when A-5 complete)
  { id: "D-1", trackId: "D", level: 1, type: "F", name: "I-IV-V on Guitar (you play)", prerequisiteLevelIds: ["A-5"] },
  { id: "D-2", trackId: "D", level: 2, type: "F", name: "I-IV-V Recognition (you listen)", prerequisiteLevelIds: ["D-1"] },
  { id: "D-3", trackId: "D", level: 3, type: "F", name: "+ The vi Chord", prerequisiteLevelIds: ["D-2"] },
  { id: "D-4", trackId: "D", level: 4, type: "P", name: "Real Progressions (Major)", prerequisiteLevelIds: ["D-3"] },
  { id: "D-5", trackId: "D", level: 5, type: "F", name: "Minor Key Changes", prerequisiteLevelIds: ["D-4"] },
  { id: "D-6", trackId: "D", level: 6, type: "P", name: "Real Songs", prerequisiteLevelIds: ["D-5"] },

  // Track E — Intervals (entered when A-5 complete; curriculum decision per rules.md §4)
  { id: "E-1", trackId: "E", level: 1, type: "F", name: "Major 2nd (2 frets)", prerequisiteLevelIds: [] },
  { id: "E-2", trackId: "E", level: 2, type: "F", name: "Major 3rd (4 frets)", prerequisiteLevelIds: ["E-1"] },
  { id: "E-3", trackId: "E", level: 3, type: "F", name: "Perfect 4th (5 frets)", prerequisiteLevelIds: ["E-2"] },
  { id: "E-4", trackId: "E", level: 4, type: "F", name: "Minor 3rd (3 frets)", prerequisiteLevelIds: ["E-3"] },
  { id: "E-5", trackId: "E", level: 5, type: "F", name: "Perfect 5th (7 frets)", prerequisiteLevelIds: ["E-4"] },
  { id: "E-6", trackId: "E", level: 6, type: "F", name: "Minor 7th (10 frets)", prerequisiteLevelIds: ["E-5"] },
  { id: "E-7", trackId: "E", level: 7, type: "P", name: "All Above — Descending", prerequisiteLevelIds: ["E-6"] },
  { id: "E-8", trackId: "E", level: 8, type: "P", name: "All Above — Cross-String", prerequisiteLevelIds: ["E-7"] },
  { id: "E-9", trackId: "E", level: 9, type: "F", name: "Hum-Then-Find", prerequisiteLevelIds: ["E-8"] },
  { id: "E-10", trackId: "E", level: 10, type: "P", name: "Sung Melody to Fretboard", prerequisiteLevelIds: ["E-9"] },
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
