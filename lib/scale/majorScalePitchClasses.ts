import type { KeyMode } from "@/lib/scale/degreeToMidi";

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11] as const;
const MINOR_NATURAL_STEPS = [0, 2, 3, 5, 7, 8, 10] as const;

/** The seven pitch classes (0–11) in diatonic order for this tonic. */
export function diatonicPitchClasses(
  tonicMidi: number,
  mode: KeyMode,
): number[] {
  const tonicPc = ((Math.round(tonicMidi) % 12) + 12) % 12;
  const steps = mode === "major" ? MAJOR_STEPS : MINOR_NATURAL_STEPS;
  return steps.map((s) => (tonicPc + s) % 12);
}
