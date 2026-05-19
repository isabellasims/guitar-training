"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DroneDegreePlayParams } from "@/lib/cards/types";
import { LessonDroneToggle } from "@/components/audio/LessonDroneToggle";
import {
  Fretboard,
  type FretboardHighlight,
} from "@/components/fretboard/Fretboard";
import { ShowPositionsToggle } from "@/components/cards/ShowPositionsToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { midiAtPosition, type StringIndex } from "@/lib/fretboard/model";
import { useContinuousPitchListener } from "@/lib/audio/continuousPitch";
import { midiToHashPitchLabel } from "@/lib/audio/noteUtils";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { Mic, MicOff } from "lucide-react";

type Outcome = "pending" | "correct" | "incorrect";

const ALL_STRINGS: StringIndex[] = [0, 1, 2, 3, 4, 5];

/**
 * Every (string, fret) position in 0..maxFret whose pitch class is in
 * `targetPitchClasses`. Used by the "Show positions" hint to light up
 * every place the requested scale degree(s) live in the current key.
 */
function positionsForPitchClasses(
  targetPitchClasses: number[],
  maxFret: number,
): FretboardHighlight[] {
  const set = new Set(
    targetPitchClasses.map((pc) => ((pc % 12) + 12) % 12),
  );
  const out: FretboardHighlight[] = [];
  for (const s of ALL_STRINGS) {
    for (let f = 0; f <= maxFret; f++) {
      const midi = midiAtPosition(s, f);
      const pc = ((midi % 12) + 12) % 12;
      if (set.has(pc)) {
        out.push({ stringIndex: s, fret: f, variant: "dim" });
      }
    }
  }
  return out;
}

/** Any MIDI with this pitch class — the listener compares pitch class only. */
function referenceMidiForPitchClass(pc: number): number {
  return 60 + (((pc % 12) + 12) % 12);
}

export function DroneDegreePlayCard({
  params,
  onContinue,
}: {
  params: DroneDegreePlayParams;
  onContinue: (correct: boolean, opts?: { usedHelp?: boolean }) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const leftHanded = useSettingsStore((s) => s.settings.leftHanded);
  const [step, setStep] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>(
    () => params.prompts.map(() => "pending"),
  );
  const [selfOk, setSelfOk] = useState<boolean | null>(null);
  const [showPositions, setShowPositions] = useState(false);
  const usedHintRef = useRef(false);
  const matchedStepRef = useRef<number | null>(null);

  const total = params.prompts.length;
  const finished = step >= total;
  const cur = !finished ? params.prompts[step] : null;

  const targetMidi =
    cur && cur.expectedPitchClasses.length > 0
      ? referenceMidiForPitchClass(cur.expectedPitchClasses[0]!)
      : null;

  useEffect(() => {
    setSelfOk(null);
    setShowPositions(false);
    matchedStepRef.current = null;
  }, [step]);

  const handleShowPositionsChange = (next: boolean) => {
    setShowPositions(next);
    if (next) usedHintRef.current = true;
  };

  const hintHighlights = useMemo(
    () =>
      cur ? positionsForPitchClasses(cur.expectedPitchClasses, 12) : [],
    [cur],
  );

  const recordOutcome = useCallback((ok: boolean) => {
    setOutcomes((prev) => {
      const next = [...prev];
      next[step] = ok ? "correct" : "incorrect";
      return next;
    });
    window.setTimeout(() => setStep((s) => s + 1), 700);
  }, [step]);

  const handlePitchMatch = useCallback(() => {
    if (matchedStepRef.current === step) return;
    matchedStepRef.current = step;
    recordOutcome(true);
  }, [step, recordOutcome]);

  const listener = useContinuousPitchListener({
    // Keep the mic open for the lifetime of the card. Tearing it down per
    // prompt creates a race window where the very first frame after
    // re-opening can latch onto residual sound and instantly "pass" the
    // next prompt — or worse, fail to capture the user's actual attempt
    // because the mic is still in its "requesting" phase. We instead pause
    // matching between prompts via `targetMidi=null` while feedback
    // animates, and rely on `requireFreshAttack: "always"` to gate the
    // next match on the user actually releasing and playing again.
    enabled: Boolean(pitchOn && hydrated && cur && !finished),
    targetMidi: outcomes[step] === "pending" ? targetMidi : null,
    targetGeneration: step,
    onMatch: handlePitchMatch,
    // The drone holds the tonic — its harmonics (especially the 5th, an
    // 8va + 5th up the partial series) and even its fundamental can leak
    // through the ducked output. With looser defaults, prompts targeting
    // the root or 5th can "pass" before the user plays. Tighter gates +
    // 3-frame minimum filter that out.
    clarityMin: 0.82,
    consecutiveFramesNeeded: 3,
    rmsMin: 0.025,
    requireFreshAttack: "always",
    armingDelayMs: 300,
  });

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-ink-mute">
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (finished) {
    const correct = outcomes.filter((o) => o === "correct").length;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{params.uiTitle ?? "Sequence complete"}</CardTitle>
          <CardDescription>
            {correct} of {total} correct.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="rust"
            onClick={() =>
              onContinue(correct >= Math.ceil(total / 2), {
                usedHelp: usedHintRef.current,
              })
            }
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!cur) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {params.uiTitle ?? `Play in ${params.keyLabel}`}
        </CardTitle>
        <CardDescription>
          {params.uiDescription ??
            `Step ${step + 1} of ${total}. Mic stays open — play each prompt when ready.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base text-ink">{cur.text}</p>
        <LessonDroneToggle
          tonicMidi={params.tonicMidi}
          keyLabel={params.keyLabel}
        />
        <ShowPositionsToggle
          enabled={showPositions}
          onChange={handleShowPositionsChange}
          emphasis={params.hintEmphasis}
        />
        {showPositions ? (
          <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
            <p className="mb-2 text-xs text-ink-mute">
              Every position of this scale degree in {params.keyLabel}.
              Counting as &ldquo;needed help&rdquo; for this prompt.
            </p>
            <Fretboard
              maxFret={12}
              highlights={hintHighlights}
              leftHanded={leftHanded}
              aria-label="Scale degree positions"
            />
          </div>
        ) : null}
        {pitchOn ? (
          <div
            className="flex items-center gap-3 rounded-md border border-rule bg-paper-soft px-3 py-2"
            role="status"
            aria-live="polite"
          >
            {listener.phase === "listening" ? (
              <Mic className="h-5 w-5 shrink-0 text-rust" strokeWidth={1.75} />
            ) : (
              <MicOff
                className="h-5 w-5 shrink-0 text-ink-mute"
                strokeWidth={1.75}
              />
            )}
            <div className="min-w-0 flex-1 text-sm">
              {listener.phase === "requesting" ? (
                <span className="text-ink-soft">Opening microphone…</span>
              ) : null}
              {listener.phase === "listening" ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-ink-soft">
                    Mic on — play when ready. Wrong notes are ignored.
                  </span>
                  {targetMidi != null ? (
                    <span className="text-xs text-ink-mute">
                      target {midiToHashPitchLabel(targetMidi)}
                      {listener.liveMidi != null
                        ? ` · heard ${midiToHashPitchLabel(listener.liveMidi)}`
                        : ""}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {listener.phase === "idle" ? (
                <span className="text-ink-soft">Starting mic…</span>
              ) : null}
              {listener.phase === "error" ? (
                <span className="text-rust">{listener.error}</span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
            <p className="mb-2 text-sm text-ink-soft">
              Pitch detection is off — self-check.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selfOk === true ? "rust" : "outline"}
                onClick={() => setSelfOk(true)}
              >
                I played it cleanly
              </Button>
              <Button
                type="button"
                variant={selfOk === false ? "rust" : "outline"}
                onClick={() => setSelfOk(false)}
              >
                Not yet
              </Button>
              <Button
                type="button"
                variant="rust"
                disabled={selfOk === null}
                onClick={() => recordOutcome(selfOk ?? false)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {outcomes[step] === "correct" ? (
          <p className="font-display text-2xl text-rust">Nice!</p>
        ) : null}
        {outcomes[step] === "incorrect" ? (
          <p className="text-sm text-rust">Moving on — we will revisit this.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
