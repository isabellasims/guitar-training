import type {
  DroneDegreeIdentifyParams,
  DroneDegreePlayParams,
} from "@/lib/cards/types";
import { midiToHashPitchLabel } from "@/lib/audio/noteUtils";

/**
 * Grouped scale-degree drills for the Degree Library (`/degrees`).
 * Play drills transpose pitch classes by tonic; identify drills hear a note
 * over the drone and pick the degree (never the root — same rule as Track A).
 */

export type DegreeDrillKind = "play" | "identify";

type DegreeDrillBase = {
  id: string;
  unlockedBy: string;
  name: string;
  description: string;
  mode: "major" | "minor";
  /** Key the authored pitch classes were written against (e.g. 60 = C). */
  baseTonicMidi: number;
  kind: DegreeDrillKind;
};

export type DegreePlayDrillItem = DegreeDrillBase & {
  kind: "play";
  prompts: DroneDegreePlayParams["prompts"];
};

export type DegreeIdentifyDrillItem = DegreeDrillBase & {
  kind: "identify";
  options: Array<{ label: string }>;
  /** Scale degrees to sample (must not include 1). */
  degreeNumbers: number[];
  roundCount: number;
};

export type DegreeDrillItem = DegreePlayDrillItem | DegreeIdentifyDrillItem;

export type DegreeDrillGroup = {
  id: string;
  name: string;
  description: string;
  items: DegreeDrillItem[];
};

function pcForDegree(
  tonicPc: number,
  mode: "major" | "minor",
  degree: number,
): number {
  const majorPcs = [0, 2, 4, 5, 7, 9, 11];
  const minorPcs = [0, 2, 3, 5, 7, 8, 10];
  const scale = mode === "major" ? majorPcs : minorPcs;
  const offset = scale[degree - 1] ?? 0;
  return (((tonicPc + offset) % 12) + 12) % 12;
}

export const DEGREE_DRILL_GROUPS: DegreeDrillGroup[] = [
  {
    id: "chord-tones-major",
    name: "Chord tones — major",
    description: "Stable triad degrees over a major drone.",
    items: [
      {
        id: "identify-third-vs-fifth",
        kind: "identify",
        unlockedBy: "A-4",
        name: "Hear 3rd vs 5th",
        description:
          "Drone holds the tonic; a single note plays. Pick bright 3rd or hovering 5th.",
        mode: "major",
        baseTonicMidi: 60,
        options: [
          { label: "The 3rd (bright)" },
          { label: "The 5th (hovering)" },
        ],
        degreeNumbers: [3, 5],
        roundCount: 8,
      },
      {
        id: "root-fifth",
        kind: "play",
        unlockedBy: "A-4",
        name: "5th & 3rd (play)",
        description: "Alternate the 5th and major 3rd over the drone — no root prompts.",
        mode: "major",
        baseTonicMidi: 60,
        prompts: [
          { text: "Play the 5th.", expectedPitchClasses: [7] },
          { text: "Play the major 3rd.", expectedPitchClasses: [4] },
          { text: "Play the 5th again.", expectedPitchClasses: [7] },
          { text: "Play the 3rd.", expectedPitchClasses: [4] },
        ],
      },
      {
        id: "identify-major-triad",
        kind: "identify",
        unlockedBy: "A-5",
        name: "Hear root, 3rd, or 5th",
        description:
          "Three chord-tone options — the drone is the root, so we never ask you to play it.",
        mode: "major",
        baseTonicMidi: 60,
        options: [
          { label: "The 3rd (bright)" },
          { label: "The 5th (hovering)" },
        ],
        degreeNumbers: [3, 5],
        roundCount: 10,
      },
      {
        id: "root-third-fifth",
        kind: "play",
        unlockedBy: "A-5",
        name: "3rd & 5th (play)",
        description: "The major triad colors without playing the tonic over the drone.",
        mode: "major",
        baseTonicMidi: 60,
        prompts: [
          { text: "Play the major 3rd.", expectedPitchClasses: [4] },
          { text: "Play the 5th.", expectedPitchClasses: [7] },
          { text: "Play the 3rd.", expectedPitchClasses: [4] },
          { text: "Play the 5th.", expectedPitchClasses: [7] },
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
        id: "identify-diatonic-major",
        kind: "identify",
        unlockedBy: "A-11",
        name: "Hear degrees 2–7",
        description:
          "Full diatonic pool (no root). Drone in the key you pick on the drill page.",
        mode: "major",
        baseTonicMidi: 60,
        options: [
          { label: "2" },
          { label: "3" },
          { label: "4" },
          { label: "5" },
          { label: "6" },
          { label: "7" },
        ],
        degreeNumbers: [2, 3, 4, 5, 6, 7],
        roundCount: 10,
      },
      {
        id: "two-four-six-seven",
        kind: "play",
        unlockedBy: "A-11",
        name: "2 · 4 · 6 · 7 (play)",
        description: "Brighter scale steps that create motion against the drone.",
        mode: "major",
        baseTonicMidi: 60,
        prompts: [
          { text: "Play the 2nd.", expectedPitchClasses: [2] },
          { text: "Play the 4th.", expectedPitchClasses: [5] },
          { text: "Play the 6th.", expectedPitchClasses: [9] },
          { text: "Play the major 7th.", expectedPitchClasses: [11] },
          { text: "Play the 4th again.", expectedPitchClasses: [5] },
        ],
      },
    ],
  },
  {
    id: "minor-key-colors",
    name: "Minor key colors",
    description:
      "Natural minor degrees anchored on A minor (transpose the key on the drill page).",
    items: [
      {
        id: "identify-flat3-vs-5",
        kind: "identify",
        unlockedBy: "A-14",
        name: "Hear b3 vs 5",
        description: "Minor color: flat third against the stable fifth.",
        mode: "minor",
        baseTonicMidi: 57,
        options: [{ label: "The flat 3rd" }, { label: "The 5th" }],
        degreeNumbers: [3, 5],
        roundCount: 8,
      },
      {
        id: "flat-three-seven-six",
        kind: "play",
        unlockedBy: "A-16",
        name: "b3 · b7 · b6 · 5 (play)",
        description: "Minor colors without resolving on the root over the drone.",
        mode: "minor",
        baseTonicMidi: 57,
        prompts: [
          { text: "Play the flat 3rd.", expectedPitchClasses: [0] },
          { text: "Play the flat 7th.", expectedPitchClasses: [7] },
          { text: "Play the flat 6th.", expectedPitchClasses: [5] },
          { text: "Play the 5th.", expectedPitchClasses: [4] },
          { text: "Return to the flat 7th.", expectedPitchClasses: [7] },
        ],
      },
      {
        id: "identify-minor-diatonic",
        kind: "identify",
        unlockedBy: "A-18",
        name: "Hear degrees 2–b7",
        description: "Six-degree minor pool (no root).",
        mode: "minor",
        baseTonicMidi: 57,
        options: [
          { label: "2" },
          { label: "b3" },
          { label: "4" },
          { label: "5" },
          { label: "b6" },
          { label: "b7" },
        ],
        degreeNumbers: [2, 3, 4, 5, 6, 7],
        roundCount: 10,
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
  item: DegreePlayDrillItem,
  tonicPc: number,
): DroneDegreePlayParams {
  const basePc = ((item.baseTonicMidi % 12) + 12) % 12;
  const delta = (((tonicPc - basePc) % 12) + 12) % 12;
  const tonicMidi = 60 + (((tonicPc % 12) + 12) % 12);
  const tonicPcNorm = ((tonicMidi % 12) + 12) % 12;
  const prompts = item.prompts
    .map((p) => ({
      ...p,
      expectedPitchClasses: p.expectedPitchClasses.map(
        (pc) => (((pc + delta) % 12) + 12) % 12,
      ),
    }))
    .filter((p) =>
      p.expectedPitchClasses.some((pc) => pc !== tonicPcNorm),
    );
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

export function buildDegreeIdentifyParams(
  item: DegreeIdentifyDrillItem,
  tonicPc: number,
): DroneDegreeIdentifyParams {
  const tonicMidi = 60 + (((tonicPc % 12) + 12) % 12);
  const tonicPcNorm = ((tonicMidi % 12) + 12) % 12;
  const rootLabel = midiToHashPitchLabel(tonicMidi);
  const keyLabel =
    item.mode === "major" ? `${rootLabel} major` : `${rootLabel} minor`;
  const key = { tonicMidi, keyLabel, mode: item.mode };

  const nonRootDegrees = item.degreeNumbers.filter((d) => d !== 1);
  const prompts: DroneDegreeIdentifyParams["prompts"] = [];
  for (let i = 0; i < item.roundCount; i++) {
    const degree =
      nonRootDegrees[Math.floor(Math.random() * nonRootDegrees.length)]!;
    const playedPitchClass = pcForDegree(tonicPcNorm, item.mode, degree);
    const correctOptionIndex = Math.max(0, nonRootDegrees.indexOf(degree));
    prompts.push({
      key,
      playedPitchClass,
      correctOptionIndex,
    });
  }

  return {
    options: item.options,
    prompts,
    uiTitle: item.name,
    uiDescription: item.description,
  };
}
