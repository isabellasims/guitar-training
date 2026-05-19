import { midiToDiagramLabel } from "@/lib/audio/noteUtils";
import type { ShapeLabelMode, ShapeRecallStep } from "@/lib/cards/types";
import { midiAtPosition } from "@/lib/fretboard/model";

/**
 * Compute the cell label for a given shape step under a given label mode.
 *
 * Returns:
 *   - `""` (intentionally blank) when mode is "none" — caller should treat
 *     this as "render no label here, even if `showNoteLabels` is on".
 *   - A string for "notes" / "fingers" / "degrees".
 *   - For "fingers" / "degrees" on steps without that metadata, falls back
 *     to the note name so the diagram is never empty mid-shape.
 */
export function labelForStep(
  step: ShapeRecallStep,
  mode: ShapeLabelMode,
): string {
  if (mode === "none") return "";
  if (mode === "fingers") {
    if (step.finger != null) return String(step.finger);
    return midiToDiagramLabel(midiAtPosition(step.stringIndex, step.fret));
  }
  if (mode === "degrees") {
    if (step.degree) return step.degree;
    return midiToDiagramLabel(midiAtPosition(step.stringIndex, step.fret));
  }
  return midiToDiagramLabel(midiAtPosition(step.stringIndex, step.fret));
}
