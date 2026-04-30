import type { TrackId } from "@/lib/domain/types";
import { getLevelsForTrack, type Level } from "@/lib/curriculum/levels";

/** Legacy node shape preserved for any older imports. */
export type TrackNode = {
  id: string;
  title: string;
  summary: string;
};

export type TrackDefinition = {
  id: TrackId;
  name: string;
  description: string;
  /** Curriculum levels in order; replaces legacy `nodes`. */
  levels: Level[];
};

const DESCRIPTIONS: Record<TrackId, { name: string; description: string }> = {
  A: {
    name: "Scale degrees",
    description:
      "The spine: tonic → stable tones → tense tones → chord-tone soloing.",
  },
  B: {
    name: "Note finding",
    description: "Pure recall — name and find any note on the neck under time.",
  },
  C: {
    name: "Fretboard & CAGED",
    description: "Shapes, pentatonic boxes, CAGED chord-tone maps.",
  },
  D: {
    name: "Chord changes",
    description: "Hear function and movement: I-IV-V, vi, real songs.",
  },
  E: {
    name: "Intervals",
    description: "Distance from a known reference — the secondary lens to scale degrees.",
  },
};

export const TRACKS: TrackDefinition[] = (
  ["A", "B", "C", "D", "E"] as const
).map((id) => ({
  id,
  ...DESCRIPTIONS[id],
  levels: getLevelsForTrack(id),
}));

export function getTrack(trackId: TrackId): TrackDefinition | undefined {
  return TRACKS.find((t) => t.id === trackId);
}
