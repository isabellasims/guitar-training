"use client";

import { useEffect, useState } from "react";

import type { ShapeRecallPlayParams } from "@/lib/cards/types";
import { PitchMicPanel } from "@/components/audio/PitchMicPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { midiAtPosition, ordinalFretPhrase } from "@/lib/fretboard/model";
import { stringIndexToPedagogyLabel } from "@/lib/fretboard/noteFinding";
import { useSettingsStore } from "@/lib/store/settingsStore";

export function ShapeRecallPlayCard({
  params,
  onContinue,
}: {
  params: ShapeRecallPlayParams;
  onContinue: (correct: boolean) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [step, setStep] = useState(0);
  const [heard, setHeard] = useState<boolean | null>(null);
  const [selfOk, setSelfOk] = useState<boolean | null>(null);

  const cur = params.steps[step];
  const targetMidi = cur
    ? midiAtPosition(cur.stringIndex, cur.fret)
    : null;
  const stepLabel = cur
    ? `Step ${step + 1} of ${params.steps.length}: ${stringIndexToPedagogyLabel(cur.stringIndex)}, ${ordinalFretPhrase(cur.fret)}.`
    : "";

  useEffect(() => {
    setHeard(null);
    setSelfOk(null);
  }, [step]);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-ink-mute">Loading…</CardContent>
      </Card>
    );
  }

  if (!cur || targetMidi == null) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-rust">Invalid shape steps.</CardContent>
        <Button type="button" variant="outline" onClick={() => onContinue(false)}>
          Skip
        </Button>
      </Card>
    );
  }

  if (!pitchOn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{params.title}</CardTitle>
          <CardDescription>
            Pitch detection is off — self-check each step in order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-soft">{params.intro}</p>
          <p className="font-medium text-ink">{stepLabel}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="rust" onClick={() => setSelfOk(true)}>
              I played this step cleanly
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelfOk(false)}>
              Not yet
            </Button>
          </div>
          {selfOk !== null ? (
            <Button
              type="button"
              variant="rust"
              onClick={() => {
                if (!selfOk) {
                  onContinue(false);
                  return;
                }
                if (step + 1 >= params.steps.length) onContinue(true);
                else setStep((s) => s + 1);
              }}
            >
              {step + 1 >= params.steps.length ? "Finish" : "Next step"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{params.title}</CardTitle>
        <CardDescription>In order — one listen per step.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-soft">{params.intro}</p>
        <p className="font-medium text-ink">{stepLabel}</p>
        <PitchMicPanel
          key={`${step}-${targetMidi}`}
          targetMidi={targetMidi}
          label={stepLabel}
          onListenResult={(ok) => setHeard(ok)}
        />
        {heard !== null ? (
          <Button
            type="button"
            variant="rust"
            onClick={() => {
              if (!heard) {
                onContinue(false);
                return;
              }
              if (step + 1 >= params.steps.length) onContinue(true);
              else setStep((s) => s + 1);
            }}
          >
            {step + 1 >= params.steps.length ? "Finish" : "Next step"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
