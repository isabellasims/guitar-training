import type { ShapeRecallStep } from "@/lib/cards/types";
import type { ShapeDefinition } from "@/lib/curriculum/shapeLibrary";
import { midiAtPosition } from "@/lib/fretboard/model";

export type ShapeScaleKind = "major" | "naturalMinor" | "minorPentatonic";

const INTERVAL_DEGREE: Record<ShapeScaleKind, Record<number, string>> = {
  major: { 0: "1", 2: "2", 4: "3", 5: "4", 7: "5", 9: "6", 11: "7" },
  naturalMinor: {
    0: "1",
    2: "2",
    3: "b3",
    5: "4",
    7: "5",
    8: "b6",
    10: "b7",
  },
  minorPentatonic: { 0: "1", 3: "b3", 5: "4", 7: "5", 10: "b7" },
};

/** Infer diatonic collection from shape metadata (Scale Library / cards). */
export function inferScaleKind(shape: ShapeDefinition): ShapeScaleKind {
  if (shape.category === "Pentatonic boxes") return "minorPentatonic";
  if (shape.defaultKeyLabel.toLowerCase().includes("minor")) {
    return "naturalMinor";
  }
  return "major";
}

/**
 * Fill missing `degree` labels from the shape's tonic + scale type.
 * Leaves existing finger/degree metadata untouched (pattern-based shapes).
 */
export function enrichShapeSteps(
  steps: ShapeRecallStep[],
  tonicPitchClass: number,
  kind: ShapeScaleKind,
): ShapeRecallStep[] {
  const map = INTERVAL_DEGREE[kind];
  const tonic = ((tonicPitchClass % 12) + 12) % 12;
  return steps.map((s) => {
    if (s.degree != null) return { ...s };
    const midi = midiAtPosition(s.stringIndex, s.fret);
    const pc = ((midi % 12) + 12) % 12;
    const rel = ((pc - tonic + 12) % 12) as number;
    const degree = map[rel];
    return degree != null ? { ...s, degree } : { ...s };
  });
}
