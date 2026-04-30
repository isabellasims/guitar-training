"use client";

import { useState } from "react";

import type { ChordToneTargetingParams } from "@/lib/cards/types";
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

export function ChordToneTargetingPlayCard({
  params,
  onContinue,
}: {
  params: ChordToneTargetingParams;
  onContinue: (correct: boolean) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [heard, setHeard] = useState<boolean | null>(null);
  const [selfOk, setSelfOk] = useState<boolean | null>(null);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-ink-mute">Loading…</CardContent>
      </Card>
    );
  }

  const drone =
    params.droneTonicMidi != null && params.droneKeyLabel != null ? (
      <LessonDroneToggle
        tonicMidi={params.droneTonicMidi}
        keyLabel={params.droneKeyLabel}
      />
    ) : null;

  const title = params.uiTitle ?? "Chord tones";
  const description =
    params.uiDescription ??
    "Any octave counts if the pitch class matches.";

  if (!pitchOn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Pitch detection is off — self-check for this card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-ink-soft">{params.prompt}</p>
          {drone}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="rust" onClick={() => setSelfOk(true)}>
              I played a chord tone cleanly
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
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-ink-soft">{params.prompt}</p>
        {drone}
        <PitchMicPanel
          key={params.prompt}
          allowedPitchClasses={params.allowedPitchClasses}
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
