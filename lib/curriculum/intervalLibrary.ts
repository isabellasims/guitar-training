import type { IntervalIdentifyParams } from "@/lib/cards/types";

/**
 * Interval Library (`/intervals`).
 *
 * Every entry is an ear-training drill: the app plays two notes, the user
 * picks which interval they just heard. Drills are grouped by the pool of
 * intervals they pull from (major/perfect, minor flavors, descending,
 * full chromatic) so users can sharpen the pairs that confuse them most.
 *
 * Drill rounds are generated at request time so each open is a fresh
 * randomized sequence (see `buildIntervalIdentifyParams`).
 */

export type IntervalOption = {
  /** Semitones above the base note. */
  semitones: number;
  /** Friendly label shown on buttons and in feedback. */
  label: string;
};

export type IntervalDrillItem = {
  id: string;
  name: string;
  description: string;
  /** Intervals the drill draws from. The full set is shown as button options. */
  pool: IntervalOption[];
  /** Directions to pick prompts from. */
  directions: ("up" | "down")[];
  /** How many prompts in one drill round. */
  roundCount: number;
};

export type IntervalDrillGroup = {
  id: string;
  name: string;
  description: string;
  items: IntervalDrillItem[];
};

// ─── Canonical intervals ────────────────────────────────────────────────

const m2 = { semitones: 1, label: "Minor 2nd" };
const M2 = { semitones: 2, label: "Major 2nd" };
const m3 = { semitones: 3, label: "Minor 3rd" };
const M3 = { semitones: 4, label: "Major 3rd" };
const P4 = { semitones: 5, label: "Perfect 4th" };
const TT = { semitones: 6, label: "Tritone" };
const P5 = { semitones: 7, label: "Perfect 5th" };
const m6 = { semitones: 8, label: "Minor 6th" };
const M6 = { semitones: 9, label: "Major 6th" };
const m7 = { semitones: 10, label: "Minor 7th" };
const M7 = { semitones: 11, label: "Major 7th" };
const P8 = { semitones: 12, label: "Octave" };

// ─── Library ─────────────────────────────────────────────────────────────

export const INTERVAL_DRILL_GROUPS: IntervalDrillGroup[] = [
  {
    id: "foundations",
    name: "Foundations",
    description: "Start here — the smallest pools, the clearest contrast.",
    items: [
      {
        id: "m3-vs-M3",
        name: "Minor 3rd vs Major 3rd",
        description:
          "The single most useful interval contrast — happy vs sad in one move.",
        pool: [m3, M3],
        directions: ["up"],
        roundCount: 8,
      },
      {
        id: "M3-vs-P5",
        name: "Major 3rd vs Perfect 5th",
        description:
          "Two pillars of the major triad. Internalize the gap between them.",
        pool: [M3, P5],
        directions: ["up"],
        roundCount: 8,
      },
      {
        id: "major-triad-intervals",
        name: "Major triad — M3, P4, P5",
        description:
          "Three close-together intervals at the heart of major harmony.",
        pool: [M3, P4, P5],
        directions: ["up"],
        roundCount: 10,
      },
    ],
  },
  {
    id: "ascending-major",
    name: "Ascending — major / perfect",
    description: "Bright intervals from the major scale, played upward.",
    items: [
      {
        id: "major-asc-no-7",
        name: "Major key — through the 6th",
        description: "M2, M3, P4, P5, M6 ascending.",
        pool: [M2, M3, P4, P5, M6],
        directions: ["up"],
        roundCount: 12,
      },
      {
        id: "major-asc-all",
        name: "Major key — all ascending",
        description: "All seven bright intervals up to the major 7th.",
        pool: [M2, M3, P4, P5, M6, M7],
        directions: ["up"],
        roundCount: 12,
      },
    ],
  },
  {
    id: "ascending-minor",
    name: "Ascending — minor & tritone",
    description: "The darker side: minor 2/3/6/7 plus the tritone.",
    items: [
      {
        id: "minor-thirds-sixths",
        name: "Minor 3rds & 6ths",
        description: "The shapes that flip major to minor.",
        pool: [m3, M3, m6, M6],
        directions: ["up"],
        roundCount: 10,
      },
      {
        id: "minor-asc-all",
        name: "Minor key — all ascending",
        description: "m2, m3, m6, m7 — the four flat intervals of minor keys.",
        pool: [m2, m3, m6, m7],
        directions: ["up"],
        roundCount: 12,
      },
      {
        id: "tritone-vs-fifth",
        name: "Tritone vs P5",
        description:
          "Half a step apart, totally different feel. Lock the tritone in.",
        pool: [TT, P5],
        directions: ["up"],
        roundCount: 8,
      },
    ],
  },
  {
    id: "descending",
    name: "Descending intervals",
    description: "Same intervals, played top-down. Trickier to identify.",
    items: [
      {
        id: "desc-major",
        name: "Major intervals descending",
        description: "M3, P4, P5, M6 — going down.",
        pool: [M3, P4, P5, M6],
        directions: ["down"],
        roundCount: 10,
      },
      {
        id: "desc-minor",
        name: "Minor intervals descending",
        description: "m3, m6, m7 — going down.",
        pool: [m3, m6, m7],
        directions: ["down"],
        roundCount: 10,
      },
      {
        id: "desc-all",
        name: "All intervals descending",
        description: "Every interval up to the octave, descending.",
        pool: [m2, M2, m3, M3, P4, TT, P5, m6, M6, m7, M7, P8],
        directions: ["down"],
        roundCount: 14,
      },
    ],
  },
  {
    id: "mastery",
    name: "Mastery — mixed",
    description: "Full chromatic pool, random direction.",
    items: [
      {
        id: "all-up",
        name: "All intervals ascending",
        description: "Every interval up to the octave, all going up.",
        pool: [m2, M2, m3, M3, P4, TT, P5, m6, M6, m7, M7, P8],
        directions: ["up"],
        roundCount: 14,
      },
      {
        id: "all-mixed",
        name: "All intervals — random direction",
        description: "Direction is a coin flip on every prompt.",
        pool: [m2, M2, m3, M3, P4, TT, P5, m6, M6, m7, M7, P8],
        directions: ["up", "down"],
        roundCount: 14,
      },
    ],
  },
];

export function findIntervalDrillItem(
  groupId: string,
  itemId: string,
): IntervalDrillItem | null {
  const g = INTERVAL_DRILL_GROUPS.find((x) => x.id === groupId);
  if (!g) return null;
  return g.items.find((i) => i.id === itemId) ?? null;
}

/**
 * Generate a fresh randomized `IntervalIdentifyParams` from a library
 * item. Base notes are picked uniformly from a comfortable mid-range
 * (C4–A4 ascending; F4–C5 descending so the second note doesn't fall
 * off the low end). The button options always show the entire pool so
 * the user has the same vocabulary every prompt.
 */
export function buildIntervalIdentifyParams(
  item: IntervalDrillItem,
): IntervalIdentifyParams {
  const options = item.pool.map((p) => ({ label: p.label }));
  const labelToIdx = new Map(item.pool.map((p, i) => [p.label, i]));
  const ascendingBase = () => 60 + Math.floor(Math.random() * 10); // C4..A4
  const descendingBase = () => 65 + Math.floor(Math.random() * 8); // F4..C5

  const prompts: IntervalIdentifyParams["prompts"] = [];
  for (let i = 0; i < item.roundCount; i++) {
    const direction =
      item.directions[Math.floor(Math.random() * item.directions.length)]!;
    const pick = item.pool[Math.floor(Math.random() * item.pool.length)]!;
    const baseMidi = direction === "up" ? ascendingBase() : descendingBase();
    prompts.push({
      baseMidi,
      semitones: pick.semitones,
      direction,
      correctOptionIndex: labelToIdx.get(pick.label) ?? 0,
      actualLabel: pick.label,
    });
  }

  return {
    uiTitle: item.name,
    // Intentionally omit uiDescription so the card's built-in "N of M.
    // Listen, then pick." progress line shows. The drill page header
    // already surfaces the long-form description.
    options,
    prompts,
  };
}
