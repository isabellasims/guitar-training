import type { BuiltCard } from "@/lib/cards/types";

/** Sample cards for Tracks B & C (full session tail after Track A intro). */
export function buildTrackBCSamplerDeck(): BuiltCard[] {
  return [
    {
      id: crypto.randomUUID(),
      templateId: "note-finding-play",
      trackId: "B",
      nodeId: "b-e-a-random",
      parameters: {
        noteName: "G",
        stringIndex: 5,
      },
    },
    {
      id: crypto.randomUUID(),
      templateId: "shape-recall-play",
      trackId: "C",
      nodeId: "c-am-shape-first",
      parameters: {
        title: "A minor — one-octave fragment",
        intro:
          "Play these three tones in order (5th string: open A, then 2nd fret B, then 3rd fret C).",
        steps: [
          { stringIndex: 4, fret: 0 },
          { stringIndex: 4, fret: 2 },
          { stringIndex: 4, fret: 3 },
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      templateId: "chord-tone-targeting-play",
      trackId: "C",
      nodeId: "c-pent-box-1",
      parameters: {
        prompt:
          "C major chord tones only: play any C, E, or G. Any octave is fine.",
        allowedPitchClasses: [0, 4, 7],
        droneTonicMidi: 60,
        droneKeyLabel: "C major",
      },
    },
  ];
}
