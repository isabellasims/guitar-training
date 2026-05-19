"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HintEmphasis } from "@/lib/cards/types";
import { cn } from "@/lib/utils";

/**
 * The "Show positions" hint toggle shared by note-finding-play and
 * drone-degree-play cards.
 *
 * - Off by default; resets per card (the parent owns the state).
 * - When enabled, the parent should light up every fret position where the
 *   target pitch class / scale degree lives.
 * - Toggling on at any point during a prompt counts as "needed help" — the
 *   parent decides what to do with that signal (typically: pass back a
 *   `usedHelp: true` flag so the card grades as 50% accuracy).
 *
 * `emphasis` controls the visual treatment:
 *   - `emphasized` — gentle pulse + tinted background, used for early
 *     levels where the toggle is genuinely useful and we want it to be
 *     discoverable.
 *   - `default`    — a regular outline button.
 *   - `subtle`     — ghosted, low contrast, for advanced levels where the
 *     user is expected to know the answer and the toggle is a quiet
 *     fallback.
 */
export function ShowPositionsToggle({
  enabled,
  onChange,
  emphasis = "default",
  className,
  hintLabel = "Show positions",
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
  emphasis?: HintEmphasis;
  className?: string;
  hintLabel?: string;
}) {
  const Icon = enabled ? EyeOff : Eye;

  // The "emphasized" variant uses a small banner-style affordance so the
  // hint is impossible to miss on a brand-new card.
  if (emphasis === "emphasized" && !enabled) {
    return (
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "group flex w-full items-center justify-between rounded-md border border-rust/40 bg-rust/8 px-3 py-2 text-left transition-colors",
          "hover:border-rust hover:bg-rust/12",
          "animate-pulse",
          className,
        )}
        aria-pressed={enabled}
      >
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-rust" strokeWidth={1.75} />
          <span className="text-sm font-medium text-rust">{hintLabel}</span>
        </span>
        <span className="text-xs text-rust/80">if you need it</span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={enabled ? "rust" : emphasis === "subtle" ? "ghost" : "outline"}
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      className={cn(
        emphasis === "subtle" && !enabled && "text-ink-mute",
        className,
      )}
      title={
        enabled
          ? "Positions visible — counts as 'needed help' for this prompt."
          : "Reveal every fret position where the target lives. Counts as 'needed help' (50% credit)."
      }
    >
      <Icon className="mr-1 h-4 w-4" strokeWidth={1.75} />
      {enabled ? "Hide positions" : hintLabel}
    </Button>
  );
}
