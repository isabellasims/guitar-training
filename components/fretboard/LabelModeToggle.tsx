"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ShapeLabelMode } from "@/lib/cards/types";

const OPTIONS: { value: ShapeLabelMode; label: string; hint: string }[] = [
  { value: "none", label: "None", hint: "No labels — pure fretboard view" },
  { value: "notes", label: "Notes", hint: "Note names (G, A, F#, …)" },
  { value: "fingers", label: "Fingers", hint: "Fingering 1–4" },
  { value: "degrees", label: "Degrees", hint: "Scale degrees relative to tonic" },
];

/**
 * Segmented control that switches the Fretboard's per-cell label content.
 * Keeps the same shape — only the labels under the user's hand change.
 *
 * Defaults are picked per surface by the caller (Scale Library → "notes",
 * concept-explainer cards → "fingers", practice cards → "none").
 */
export function LabelModeToggle({
  value,
  onChange,
  className,
}: {
  value: ShapeLabelMode;
  onChange: (next: ShapeLabelMode) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Fretboard label mode"
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-md border border-rule bg-paper-soft p-1",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            size="sm"
            variant={selected ? "rust" : "ghost"}
            className={cn(
              "h-8 px-3 text-xs",
              !selected && "text-ink-soft hover:text-ink",
            )}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
