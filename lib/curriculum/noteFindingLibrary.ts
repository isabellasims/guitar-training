import type { NoteFindingPlayParams } from "@/lib/cards/types";

/**
 * Catalog for the Note-Finding Library. Each entry mirrors the per-level
 * Track B drills, plus a stable id so we can route to it from
 * `/notes/[cardId]`.
 *
 * Library items are gated by Track B level completion: an entry only shows up
 * once the user has completed its `unlockedBy` level.
 */

export type NoteFindingLibraryEntry = {
  id: string;
  unlockedBy: string;
  name: string;
  description: string;
  buildParams: () => NoteFindingPlayParams;
};

const NATURAL_NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const ALL_CHROMATIC = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const NOTE_FINDING_ENTRIES: NoteFindingLibraryEntry[] = [
  {
    id: "low-e-natural",
    unlockedBy: "B-1",
    name: "Low E string drill",
    description: "Random natural notes on the 6th string.",
    buildParams: () => ({
      pool: { notes: NATURAL_NOTES, stringIndices: [5] },
      roundCount: 12,
    }),
  },
  {
    id: "a-string-natural",
    unlockedBy: "B-2",
    name: "A string drill",
    description: "Random natural notes on the 5th string only.",
    buildParams: () => ({
      pool: { notes: NATURAL_NOTES, stringIndices: [4] },
      roundCount: 12,
    }),
  },
  {
    id: "e-and-a-natural",
    unlockedBy: "B-3",
    name: "E + A string drill",
    description: "Random natural notes on the 6th and 5th strings.",
    buildParams: () => ({
      pool: { notes: NATURAL_NOTES, stringIndices: [5, 4] },
      roundCount: 12,
    }),
  },
  {
    id: "d-string-natural",
    unlockedBy: "B-4",
    name: "D string drill",
    description: "Random natural notes on the 4th string only.",
    buildParams: () => ({
      pool: { notes: NATURAL_NOTES, stringIndices: [3] },
      roundCount: 12,
    }),
  },
  {
    id: "g-string-natural",
    unlockedBy: "B-5",
    name: "G string drill",
    description: "Random natural notes on the 3rd string only.",
    buildParams: () => ({
      pool: { notes: NATURAL_NOTES, stringIndices: [2] },
      roundCount: 12,
    }),
  },
  {
    id: "b-string-natural",
    unlockedBy: "B-6",
    name: "2nd string (B) drill",
    description: "Random natural notes on the 2nd string only.",
    buildParams: () => ({
      pool: { notes: NATURAL_NOTES, stringIndices: [1] },
      roundCount: 12,
    }),
  },
  {
    id: "high-e-natural",
    unlockedBy: "B-7",
    name: "High E string drill",
    description: "Random natural notes on the 1st string only.",
    buildParams: () => ({
      pool: { notes: NATURAL_NOTES, stringIndices: [0] },
      roundCount: 12,
    }),
  },
  {
    id: "find-c",
    unlockedBy: "B-8",
    name: "Find C across all strings",
    description: "C on each of the 6 strings.",
    buildParams: () => ({
      pool: { notes: ["C"] },
      roundCount: 12,
    }),
  },
  {
    id: "find-g",
    unlockedBy: "B-9",
    name: "Find G across all strings",
    description: "G on each of the 6 strings.",
    buildParams: () => ({
      pool: { notes: ["G"] },
      roundCount: 12,
    }),
  },
  {
    id: "find-d",
    unlockedBy: "B-10",
    name: "Find D across all strings",
    description: "D on each string.",
    buildParams: () => ({
      pool: { notes: ["D"] },
      roundCount: 12,
    }),
  },
  {
    id: "find-a",
    unlockedBy: "B-11",
    name: "Find A across all strings",
    description: "The note A on each string.",
    buildParams: () => ({
      pool: { notes: ["A"] },
      roundCount: 12,
    }),
  },
  {
    id: "find-e-note",
    unlockedBy: "B-12",
    name: "Find E across all strings",
    description: "The note E on each string.",
    buildParams: () => ({
      pool: { notes: ["E"] },
      roundCount: 12,
    }),
  },
  {
    id: "find-f",
    unlockedBy: "B-13",
    name: "Find F across all strings",
    description: "F on each string.",
    buildParams: () => ({
      pool: { notes: ["F"] },
      roundCount: 12,
    }),
  },
  {
    id: "find-b-note",
    unlockedBy: "B-14",
    name: "Find B (note) across all strings",
    description: "The note B on each string.",
    buildParams: () => ({
      pool: { notes: ["B"] },
      roundCount: 12,
    }),
  },
  {
    id: "random-sharps-flats",
    unlockedBy: "B-15",
    name: "Random sharps and flats",
    description: "Random chromatic note on a random string.",
    buildParams: () => ({
      pool: { notes: ["C#", "D#", "F#", "G#", "A#"] },
      roundCount: 12,
    }),
  },
  {
    id: "full-recall",
    unlockedBy: "B-17",
    name: "Full fretboard recall",
    description: "Any chromatic note on any string.",
    buildParams: () => ({
      pool: { notes: ALL_CHROMATIC },
      roundCount: 12,
    }),
  },
  {
    id: "speed-mode",
    unlockedBy: "B-18",
    name: "Speed mode (under 2s)",
    description: "Same as full recall, with a 2-second timer per prompt.",
    buildParams: () => ({
      pool: { notes: ALL_CHROMATIC },
      roundCount: 12,
      speedTimerSec: 2,
    }),
  },
];

export const NOTE_FINDING_BY_ID: Record<string, NoteFindingLibraryEntry> =
  NOTE_FINDING_ENTRIES.reduce(
    (acc, e) => {
      acc[e.id] = e;
      return acc;
    },
    {} as Record<string, NoteFindingLibraryEntry>,
  );
