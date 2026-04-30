"use client";

import { useEffect, useMemo, useState } from "react";

import type { NoteFindingPlayParams } from "@/lib/cards/types";
import { PitchMicPanel } from "@/components/audio/PitchMicPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StringIndex } from "@/lib/fretboard/model";
import {
  stringIndexToPedagogyLabel,
  targetMidiNoteOnString,
} from "@/lib/fretboard/noteFinding";
import { useSettingsStore } from "@/lib/store/settingsStore";

/** 6th string (low E) → 1st string (high e). */
const STRING_ORDER: StringIndex[] = [5, 4, 3, 2, 1, 0];

export function NoteFindingPlayCard({
  params,
  onContinue,
}: {
  params: NoteFindingPlayParams;
  onContinue: (correct: boolean) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);

  const multi = params.allStringsLowestFret === true;
  const stringIndex = params.stringIndex;

  const steps = useMemo(() => {
    if (!multi) {
      if (stringIndex === undefined) return [];
      const m = targetMidiNoteOnString(params.noteName, stringIndex);
      return m != null ? [{ stringIndex, midi: m }] : [];
    }
    const out: { stringIndex: StringIndex; midi: number }[] = [];
    for (const si of STRING_ORDER) {
      const m = targetMidiNoteOnString(params.noteName, si);
      if (m != null) out.push({ stringIndex: si, midi: m });
    }
    return out;
  }, [multi, params.noteName, stringIndex]);

  const [step, setStep] = useState(0);
  const [heard, setHeard] = useState<boolean | null>(null);
  const [selfOk, setSelfOk] = useState<boolean | null>(null);

  const cur = steps[step];
  const total = steps.length;

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

  if (!multi && stringIndex === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Note finding</CardTitle>
          <CardDescription>Card is misconfigured.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => onContinue(false)}>
            Skip
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!cur || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Note finding</CardTitle>
          <CardDescription>Could not resolve this note on the neck.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => onContinue(false)}>
            Skip
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stringDesc = stringIndexToPedagogyLabel(cur.stringIndex);
  const stepLabel = multi
    ? `String ${step + 1} of ${total}: ${stringDesc} — lowest ${params.noteName} in frets 0–12.`
    : `Find ${params.noteName} on the ${params.stringDescription ?? stringDesc}.`;

  const finishStep = (ok: boolean) => {
    if (!ok) {
      onContinue(false);
      return;
    }
    if (step + 1 >= total) onContinue(true);
    else setStep((s) => s + 1);
  };

  if (!pitchOn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{multi ? `Find ${params.noteName} everywhere` : "Note finding"}</CardTitle>
          <CardDescription>
            Pitch detection is off — self-check for this card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-ink-soft">{stepLabel}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="rust" onClick={() => setSelfOk(true)}>
              I played the right fret
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
                if (selfOk) finishStep(true);
                else onContinue(false);
              }}
            >
              {step + 1 >= total ? "Finish" : "Next string"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{multi ? `Find ${params.noteName} on each string` : "Note finding"}</CardTitle>
        <CardDescription>
          {multi
            ? "Lowest position per string in the first twelve frets."
            : "Lowest position in the first twelve frets."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-ink-soft">{stepLabel}</p>
        <PitchMicPanel
          key={`${cur.midi}-${step}-${cur.stringIndex}`}
          targetMidi={cur.midi}
          label={stepLabel}
          onListenResult={(ok) => setHeard(ok)}
        />
        {heard !== null ? (
          <Button
            type="button"
            variant="rust"
            onClick={() => finishStep(heard)}
          >
            {step + 1 >= total ? "Finish" : "Next string"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
