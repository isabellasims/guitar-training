import type { TrackId } from "@/lib/domain/types";

import { TRACK_A_NODES } from "@/lib/tracks/trackA";
import { TRACK_B_NODES } from "@/lib/tracks/trackB";
import { TRACK_C_NODES } from "@/lib/tracks/trackC";
import { TRACK_D_NODES } from "@/lib/tracks/trackD";

export type TrackNode = {
  id: string;
  title: string;
  summary: string;
};

export type TrackDefinition = {
  id: TrackId;
  name: string;
  description: string;
  nodes: TrackNode[];
};

export const TRACKS: TrackDefinition[] = [
  {
    id: "A",
    name: "Scale degrees",
    description:
      "The spine: tonic, stable tones, tense tones, and chord-tone thinking — from the practice manual.",
    nodes: [...TRACK_A_NODES],
  },
  {
    id: "B",
    name: "Find it on the neck",
    description: "Locate notes and intervals on the fretboard under time pressure.",
    nodes: [...TRACK_B_NODES],
  },
  {
    id: "C",
    name: "Shapes and chord tones",
    description: "CAGED-style shapes and chord-tone targeting.",
    nodes: [...TRACK_C_NODES],
  },
  {
    id: "D",
    name: "Chord changes",
    description:
      "Hear function and common progressions — quizzes now; recorded chord bank later.",
    nodes: [...TRACK_D_NODES],
  },
];

export function getTrack(trackId: TrackId): TrackDefinition | undefined {
  return TRACKS.find((t) => t.id === trackId);
}
