"use client";

import { useState } from "react";

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
import {
  stringIndexToPedagogyLabel,
  targetMidiNoteOnString,
} from "@/lib/fretboard/noteFinding";
import { useSettingsStore } from "@/lib/store/settingsStore";

export function NoteFindingPlayCard({
  params,
  onContinue,
}: {
  params: NoteFindingPlayParams;
  onContinue: (correct: boolean) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const stringDesc =
    params.stringDescription ?? stringIndexToPedagogyLabel(params.stringIndex);
  const targetMidi = targetMidiNoteOnString(params.noteName, params.stringIndex);
  const [heard, setHeard] = useState<boolean | null>(null);
  const [selfOk, setSelfOk] = useState<boolean | null>(null);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-ink-mute">Loading…</CardContent>
      </Card>
    );
  }

  if (targetMidi == null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Note finding</CardTitle>
          <CardDescription>Invalid note name in this card.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => onContinue(false)}>
            Skip
          </Button>
        </CardContent>
      </Card>
    );
  }

  const prompt = `Find ${params.noteName} on the ${stringDesc}.`;

  if (!pitchOn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Note finding</CardTitle>
          <CardDescription>
            Pitch detection is off — self-check for this card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-ink-soft">{prompt}</p>
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
              variant={selfOk ? "rust" : "outline"}
              onClick={() => onContinue(selfOk)}
            >
              Continue
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Note finding</CardTitle>
        <CardDescription>Lowest position in the first twelve frets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-ink-soft">{prompt}</p>
        <PitchMicPanel
          key={`${targetMidi}-${params.noteName}-${params.stringIndex}`}
          targetMidi={targetMidi}
          label={prompt}
          onListenResult={(ok) => setHeard(ok)}
        />
        {heard !== null ? (
          <Button
            type="button"
            variant="rust"
            onClick={() => onContinue(heard)}
          >
            Continue
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
