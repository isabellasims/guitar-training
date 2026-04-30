"use client";

import { useState } from "react";

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
import { midiForScaleDegree } from "@/lib/scale/degreeToMidi";
import { useSettingsStore } from "@/lib/store/settingsStore";

export function DroneDegreePlayCard({
  params,
  onContinue,
}: {
  params: DroneDegreePlayParams;
  onContinue: (correct: boolean) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const targetMidi = midiForScaleDegree(
    params.tonicMidi,
    params.mode,
    params.degree,
  );
  const [heard, setHeard] = useState<boolean | null>(null);
  const [selfOk, setSelfOk] = useState<boolean | null>(null);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-ink-mute">Loading…</CardContent>
      </Card>
    );
  }

  if (!pitchOn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Play the degree</CardTitle>
          <CardDescription>
            Pitch detection is off in Settings — self-check for this card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-ink-soft">{params.prompt}</p>
          <LessonDroneToggle
            tonicMidi={params.tonicMidi}
            keyLabel={params.keyLabel}
          />
          <p className="text-sm text-ink-mute">
            Optional: Library has more keys later — for this card, use the button
            above.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="rust" onClick={() => setSelfOk(true)}>
              I played it cleanly
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
        <CardTitle>Play the degree</CardTitle>
        <CardDescription>
          {params.keyLabel} — use the drone button below, then play when ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-ink-soft">{params.prompt}</p>
        <LessonDroneToggle
          tonicMidi={params.tonicMidi}
          keyLabel={params.keyLabel}
        />
        <PitchMicPanel
          key={`${targetMidi}-${params.prompt}`}
          targetMidi={targetMidi}
          label={params.prompt}
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
