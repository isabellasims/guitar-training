import type { ChordChangeIdentifyParams } from "@/lib/cards/types";
import {
  diatonicChords,
  ROOT_CHOICES,
  type DiatonicChord,
} from "@/lib/music/chords";

/**
 * Chord Function Library (`/chord-functions`).
 *
 * Drill section for "hear it, name the function": app plays a short
 * diatonic progression, then asks the user which Roman-numeral function
 * was at a specific position in the loop. Each entry pins down:
 *
 *   - The key mode (major or natural minor).
 *   - The pool of functions the drill draws from (e.g. {I, IV, V}).
 *   - Number of rounds in one drill session.
 *
 * The drill page picks a tonic at runtime and generates a fresh random
 * progression per round so opening the same drill twice is two different
 * experiences. Progressions are stitched together with simple rules:
 * always start on the tonic (I/i), random non-tonic functions in the
 * middle, ask the user about one of the middle chords.
 */

export type ChordFunctionDrillItem = {
  id: string;
  name: string;
  description: string;
  mode: "major" | "minor";
  /**
   * Functions in scope. Always include the tonic — every progression
   * anchors on it. Use the Roman numerals from `lib/music/chords.ts`:
   * major mode uses {I, ii, iii, IV, V, vi, vii°}; minor uses
   * {i, ii°, III, iv, v, VI, VII}.
   */
  pool: string[];
  /** How many chords per progression. */
  chordsPerProgression: number;
  /** How many prompts per drill round. */
  roundCount: number;
};

export type ChordFunctionDrillGroup = {
  id: string;
  name: string;
  description: string;
  items: ChordFunctionDrillItem[];
};

// ─── Library ─────────────────────────────────────────────────────────────

export const CHORD_FUNCTION_GROUPS: ChordFunctionDrillGroup[] = [
  {
    id: "major-basics",
    name: "Major key — basics",
    description: "Start with the two-chord and three-chord pools.",
    items: [
      {
        id: "I-V",
        name: "I and V",
        description: "The two pillars of major-key harmony.",
        mode: "major",
        pool: ["I", "V"],
        chordsPerProgression: 4,
        roundCount: 8,
      },
      {
        id: "I-IV-V",
        name: "I, IV, V",
        description: "The classic three-chord pool — the foundation of most pop songs.",
        mode: "major",
        pool: ["I", "IV", "V"],
        chordsPerProgression: 4,
        roundCount: 10,
      },
      {
        id: "I-IV-V-vi",
        name: "I, IV, V, vi",
        description: "Add the relative minor — the four chords behind most modern songs.",
        mode: "major",
        pool: ["I", "IV", "V", "vi"],
        chordsPerProgression: 4,
        roundCount: 12,
      },
    ],
  },
  {
    id: "major-extended",
    name: "Major key — extended diatonic",
    description: "Bring in the ii and the iii.",
    items: [
      {
        id: "ii-V-I",
        name: "ii, V, I",
        description: "The most common cadence in tonal music.",
        mode: "major",
        pool: ["I", "ii", "V"],
        chordsPerProgression: 4,
        roundCount: 10,
      },
      {
        id: "I-ii-IV-V-vi",
        name: "I, ii, IV, V, vi",
        description: "Five of the seven diatonic chords — the most useful set.",
        mode: "major",
        pool: ["I", "ii", "IV", "V", "vi"],
        chordsPerProgression: 4,
        roundCount: 12,
      },
      {
        id: "full-diatonic-major",
        name: "All seven diatonic chords",
        description: "I, ii, iii, IV, V, vi, vii° — every function in scope.",
        mode: "major",
        pool: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
        chordsPerProgression: 4,
        roundCount: 14,
      },
    ],
  },
  {
    id: "minor-basics",
    name: "Minor key — basics",
    description: "Same idea, anchored on the minor tonic.",
    items: [
      {
        id: "i-V",
        name: "i and V",
        description: "Minor tonic and the dominant — the simplest minor pull.",
        mode: "minor",
        pool: ["i", "V"],
        chordsPerProgression: 4,
        roundCount: 8,
      },
      {
        id: "i-iv-V",
        name: "i, iv, V",
        description: "The minor 'three chord' pool. Same role as I-IV-V in major.",
        mode: "minor",
        pool: ["i", "iv", "V"],
        chordsPerProgression: 4,
        roundCount: 10,
      },
      {
        id: "i-iv-VI-VII",
        name: "i, iv, VI, VII",
        description: "Pop-minor: the dark four-chord vamp.",
        mode: "minor",
        pool: ["i", "iv", "VI", "VII"],
        chordsPerProgression: 4,
        roundCount: 12,
      },
    ],
  },
  {
    id: "minor-extended",
    name: "Minor key — full diatonic",
    description: "Every natural-minor diatonic chord in play.",
    items: [
      {
        id: "full-diatonic-minor",
        name: "All seven diatonic chords",
        description: "i, ii°, III, iv, v, VI, VII — every function in the natural minor.",
        mode: "minor",
        pool: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
        chordsPerProgression: 4,
        roundCount: 14,
      },
    ],
  },
];

export function findChordFunctionDrillItem(
  groupId: string,
  itemId: string,
): ChordFunctionDrillItem | null {
  const g = CHORD_FUNCTION_GROUPS.find((x) => x.id === groupId);
  if (!g) return null;
  return g.items.find((i) => i.id === itemId) ?? null;
}

// ─── Card construction ──────────────────────────────────────────────────

function tonicRoman(mode: "major" | "minor"): string {
  return mode === "major" ? "I" : "i";
}

function chordByRoman(
  chords: DiatonicChord[],
  roman: string,
): DiatonicChord | null {
  return chords.find((c) => c.roman === roman) ?? null;
}

/**
 * Build one randomized progression of `length` chords whose function set
 * lies entirely within `pool` and always starts on the tonic. Chord 2..N
 * are uniformly random from the non-tonic functions in the pool, with no
 * three consecutive identical chords.
 */
function randomProgression(
  pool: string[],
  mode: "major" | "minor",
  length: number,
): string[] {
  const tonic = tonicRoman(mode);
  const nonTonic = pool.filter((r) => r !== tonic);
  // Safety net: if the user picks a pool of just {tonic}, fall back to
  // tonic-only progressions — they're degenerate but at least don't crash.
  if (nonTonic.length === 0) {
    return Array.from({ length }, () => tonic);
  }
  const out: string[] = [tonic];
  for (let i = 1; i < length; i++) {
    let pick = nonTonic[Math.floor(Math.random() * nonTonic.length)]!;
    if (i >= 2 && out[i - 1] === pick && out[i - 2] === pick) {
      // Avoid three-in-a-row repeats by picking again, once.
      pick = nonTonic[Math.floor(Math.random() * nonTonic.length)]!;
    }
    out.push(pick);
  }
  return out;
}

/**
 * Build a fresh `ChordChangeIdentifyParams` from a library item + chosen
 * tonic pitch class. Each prompt has its own randomized progression and
 * randomly chosen "which chord?" position (1-indexed). The asked
 * position is always one of the middle/end chords — chord 1 is the
 * tonic and would give the answer away.
 */
export function buildChordFunctionIdentifyParams(
  item: ChordFunctionDrillItem,
  tonicPc: number,
): ChordChangeIdentifyParams {
  const tonicMidi = 60 + (((tonicPc % 12) + 12) % 12);
  const chords = diatonicChords(tonicMidi, item.mode);
  const optionsRomans = [...item.pool];
  const options = optionsRomans.map((r) => ({ label: r }));
  const tonicLabel =
    ROOT_CHOICES.find((c) => c.pc === tonicPc)?.sharpName ?? "C";
  const keyLabel = `${tonicLabel} ${item.mode}`;

  const prompts: ChordChangeIdentifyParams["prompts"] = [];
  for (let p = 0; p < item.roundCount; p++) {
    const progression = randomProgression(
      item.pool,
      item.mode,
      item.chordsPerProgression,
    );
    const askPositionIndex =
      2 + Math.floor(Math.random() * (progression.length - 1));
    const askedRoman = progression[askPositionIndex - 1]!;
    const chordSequence = progression.map((roman) => {
      const c = chordByRoman(chords, roman);
      // If a roman isn't in the diatonic table (shouldn't happen if the
      // library entry's pool is curated), fall back to the tonic. This
      // keeps the audio path alive even with a misconfigured pool.
      return c ? c.notes : chords[0]!.notes;
    });
    const chordNames = progression.map((roman) => {
      const c = chordByRoman(chords, roman);
      return c ? `${roman} (${c.rootName} ${c.qualityLabel})` : roman;
    });
    prompts.push({
      keyLabel,
      chords: chordSequence,
      askPositionIndex,
      correctOptionIndex: optionsRomans.indexOf(askedRoman),
      chordNames,
      transitionText: `Listen for chord ${askPositionIndex} of ${progression.length}. Key: ${keyLabel}.`,
    });
  }

  return {
    uiTitle: item.name,
    // Intentionally omit uiDescription so the card's built-in
    // "<key>. N of M." progress line shows. The drill page header
    // already surfaces the long-form description.
    options,
    prompts,
  };
}
