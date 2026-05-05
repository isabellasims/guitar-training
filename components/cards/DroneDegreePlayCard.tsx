"use client";

import { useEffect, useState } from "react";

import type { DroneDegreePlayParams } from "@/lib/cards/types";
import { LessonDroneToggle } from "@/components/audio/LessonDroneToggle";
import { PitchMicPanel } from "@/components/audio/PitchMicPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSettingsStore } from "@/lib/store/settingsStore";

type Outcome = "pending" | "correct" | "incorrect";

export function DroneDegreePlayCard({
  params,
  onContinue,
}: {
  params: DroneDegreePlayParams;
  onContinue: (correct: boolean) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [step, setStep] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>(
    () => params.prompts.map(() => "pending"),
  );
  const [selfOk, setSelfOk] = useState<boolean | null>(null);

  useEffect(() => {
    setSelfOk(null);
  }, [step]);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-ink-mute">
          Loading…
        </CardContent>
      </Card>
    );
  }

  const cur = params.prompts[step];
  const total = params.prompts.length;
  const finished = step >= total;

  if (!cur || finished) {
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
            onClick={() => onContinue(correct >= Math.ceil(total / 2))}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  const recordOutcome = (ok: boolean) => {
    setOutcomes((prev) => {
      const next = [...prev];
      next[step] = ok ? "correct" : "incorrect";
      return next;
    });
    window.setTimeout(() => setStep((s) => s + 1), 700);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {params.uiTitle ?? `Play in ${params.keyLabel}`}
        </CardTitle>
        <CardDescription>
          {params.uiDescription ??
            `Step ${step + 1} of ${total}. Use the drone, then play.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base text-ink">{cur.text}</p>
        <LessonDroneToggle
          tonicMidi={params.tonicMidi}
          keyLabel={params.keyLabel}
        />
        {pitchOn ? (
          <PitchMicPanel
            key={`${step}-${cur.expectedPitchClasses.join(",")}`}
            allowedPitchClasses={cur.expectedPitchClasses}
            label={cur.text}
            onListenResult={recordOutcome}
          />
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
