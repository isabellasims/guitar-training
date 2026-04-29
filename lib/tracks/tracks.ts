import type { TrackId } from "@/lib/domain/types";

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

/** Placeholder nodes — replace with full lists from `guitar-practice-plan.html`. */
export const TRACKS: TrackDefinition[] = [
  {
    id: "A",
    name: "Hear the key",
    description: "Tonic recognition, drone work, and scale degrees in context.",
    nodes: [
      {
        id: "a-1",
        title: "Drone and tonic",
        summary: "Stabilize the key center with the long drone.",
      },
      {
        id: "a-2",
        title: "Scale degrees in plain English",
        summary: "Name degrees by ear before naming them on the neck.",
      },
    ],
  },
  {
    id: "B",
    name: "Find it on the neck",
    description: "Locate notes and intervals on the fretboard under time pressure.",
    nodes: [
      {
        id: "b-1",
        title: "Single-note finding",
        summary: "Play the requested pitch; pitch detection verifies.",
      },
    ],
  },
  {
    id: "C",
    name: "Shapes and chord tones",
    description: "CAGED-style shapes and chord-tone targeting.",
    nodes: [
      {
        id: "c-1",
        title: "Shape recall",
        summary: "Ascend and descend a shape; sequence checked by pitch.",
      },
    ],
  },
  {
    id: "D",
    name: "Chord changes",
    description: "Hear function and common progressions (audio-backed).",
    nodes: [
      {
        id: "d-1",
        title: "Function quiz",
        summary: "Multiple choice on chord role in the key.",
      },
    ],
  },
];

export function getTrack(trackId: TrackId): TrackDefinition | undefined {
  return TRACKS.find((t) => t.id === trackId);
}
