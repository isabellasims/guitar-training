import type { DroneDegreePlayParams } from "@/lib/cards/types";
import { midiToHashPitchLabel } from "@/lib/audio/noteUtils";

/**
 * Grouped scale-degree drills for the Degree Library (`/degrees`).
 * Prompts are authored in a base key; the drill page transposes by tonic.
 */

export type DegreeDrillItem = {
  id: string;
  unlockedBy: string;
  name: string;
  description: string;
  mode: "major" | "minor";
  /** Key the `prompts` pitch classes were written against (e.g. 60 = C). */
  baseTonicMidi: number;
  prompts: DroneDegreePlayParams["prompts"];
};

export type DegreeDrillGroup = {
  id: string;
  name: string;
  description: string;
  items: DegreeDrillItem[];
};

export const DEGREE_DRILL_GROUPS: DegreeDrillGroup[] = [
  {
    id: "chord-tones-major",
    name: "Chord tones — major",
    description: "Stable triad degrees over a major drone, one group at a time.",
    items: [
      {
        id: "root-fifth",
        unlockedBy: "A-4",
        name: "Root & 5th",
        description: "Alternate the root and fifth — the backbone of most lines.",
        mode: "major",
        baseTonicMidi: 60,
        prompts: [
          { text: "Play the root.", expectedPitchClasses: [0] },
          { text: "Play the 5th.", expectedPitchClasses: [7] },
          { text: "Play the root again.", expectedPitchClasses: [0] },
          { text: "Play the 5th.", expectedPitchClasses: [7] },
        ],
      },
      {
        id: "root-third-fifth",
        unlockedBy: "A-5",
        name: "Root, 3rd, 5th",
        description: "The major triad in order and out of order.",
        mode: "major",
        baseTonicMidi: 60,
        prompts: [
          { text: "Play the root.", expectedPitchClasses: [0] },
          { text: "Play the major 3rd.", expectedPitchClasses: [4] },
          { text: "Play the 5th.", expectedPitchClasses: [7] },
          { text: "Play the 3rd.", expectedPitchClasses: [4] },
          { text: "Resolve to the root.", expectedPitchClasses: [0] },
        ],
      },
    ],
  },
  {
    id: "diatonic-steps-major",
    name: "Diatonic color — major",
    description: "Non-chord-tone scale degrees in the major key.",
    items: [
      {
        id: "two-four-six-seven",
        unlockedBy: "A-11",
        name: "2 · 4 · 6 · 7",
        description: "The brighter scale steps that create motion against the drone.",
        mode: "major",
        baseTonicMidi: 60,
        prompts: [
          { text: "Play the 2nd.", expectedPitchClasses: [2] },
          { text: "Play the 4th.", expectedPitchClasses: [5] },
          { text: "Play the 6th.", expectedPitchClasses: [9] },
          { text: "Play the major 7th.", expectedPitchClasses: [11] },
          { text: "Play the 4th again.", expectedPitchClasses: [5] },
          { text: "Land on the root.", expectedPitchClasses: [0] },
        ],
      },
    ],
  },
  {
    id: "minor-key-colors",
    name: "Minor key colors",
    description: "Natural minor degrees anchored on A minor (transpose the key on the drill page).",
    items: [
      {
        id: "flat-three-seven-six",
        unlockedBy: "A-16",
        name: "b3 · b7 · b6 · 5",
        description: "Minor colors: flat third, flat seventh, flat sixth, then the fifth.",
        mode: "minor",
        baseTonicMidi: 57,
        prompts: [
          { text: "Play the flat 3rd.", expectedPitchClasses: [0] },
          { text: "Play the flat 7th.", expectedPitchClasses: [7] },
          { text: "Play the flat 6th.", expectedPitchClasses: [5] },
          { text: "Play the 5th.", expectedPitchClasses: [4] },
          { text: "Return to the flat 7th.", expectedPitchClasses: [7] },
          { text: "Resolve to the root.", expectedPitchClasses: [9] },
        ],
      },
    ],
  },
];

export function findDegreeDrillItem(
  groupId: string,
  itemId: string,
): DegreeDrillItem | null {
  const g = DEGREE_DRILL_GROUPS.find((x) => x.id === groupId);
  if (!g) return null;
  return g.items.find((i) => i.id === itemId) ?? null;
}

export function buildDegreeDrillParams(
  item: DegreeDrillItem,
  tonicPc: number,
): DroneDegreePlayParams {
  const basePc = ((item.baseTonicMidi % 12) + 12) % 12;
  const delta = (((tonicPc - basePc) % 12) + 12) % 12;
  const tonicMidi = 60 + (((tonicPc % 12) + 12) % 12);
  const prompts = item.prompts.map((p) => ({
    ...p,
    expectedPitchClasses: p.expectedPitchClasses.map(
      (pc) => (((pc + delta) % 12) + 12) % 12,
    ),
  }));
  const rootLabel = midiToHashPitchLabel(tonicMidi);
  const keyLabel =
    item.mode === "major" ? `${rootLabel} major` : `${rootLabel} minor`;
  return {
    keyLabel,
    tonicMidi,
    mode: item.mode,
    prompts,
    hintEmphasis: "default",
    uiTitle: item.name,
    uiDescription: item.description,
  };
}
