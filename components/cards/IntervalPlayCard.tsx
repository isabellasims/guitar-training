"use client";

import { useEffect, useState } from "react";

import type { IntervalPlayParams } from "@/lib/cards/types";
import { PitchMicPanel } from "@/components/audio/PitchMicPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { playReferenceMidiNote } from "@/lib/audio/referenceNote";
import { midiToPlainEnglishNote } from "@/lib/audio/noteUtils";
import { useSettingsStore } from "@/lib/store/settingsStore";

export function IntervalPlayCard({
  params,
  onContinue,
}: {
  params: IntervalPlayParams;
  onContinue: (correct: boolean) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [playingRef, setPlayingRef] = useState(false);
  const [selfOk, setSelfOk] = useState<boolean | null>(null);

  const offset =
    params.direction === "up" ? params.semitones : -params.semitones;
  const targetMidi = params.baseMidi + offset;

  useEffect(() => {
    setSelfOk(null);
  }, [params.baseMidi, params.semitones, params.direction]);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-ink-mute">
          Loading…
        </CardContent>
      </Card>
    );
  }

  const playRef = async () => {
    setPlayingRef(true);
    try {
      await playReferenceMidiNote(params.baseMidi, { durationSec: 0.7 });
    } finally {
      setPlayingRef(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interval — {params.label}</CardTitle>
        <CardDescription>
          Hear the reference, then play the {params.label}{" "}
          {params.direction === "up" ? "above" : "below"} it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-soft">{params.prompt}</p>
        <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
          <p className="mb-2 text-xs text-ink-mute">
            Reference: {midiToPlainEnglishNote(params.baseMidi)}.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={playingRef}
            onClick={() => void playRef()}
          >
            {playingRef ? "Playing…" : "Hear reference"}
          </Button>
        </div>
        {pitchOn ? (
          <PitchMicPanel
            targetMidi={targetMidi}
            label={`Play the ${params.label} ${
              params.direction === "up" ? "above" : "below"
            } the reference.`}
            onListenResult={(ok) => onContinue(ok)}
          />
        ) : (
          <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
            <p className="mb-2 text-sm text-ink-soft">
              Pitch detection is off. Self-rate after you play the interval.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={selfOk === true ? "rust" : "outline"}
                onClick={() => setSelfOk(true)}
              >
                Got it
              </Button>
              <Button
                type="button"
                variant={selfOk === false ? "rust" : "outline"}
                onClick={() => setSelfOk(false)}
              >
                Missed it
              </Button>
              <Button
                type="button"
                variant="rust"
                disabled={selfOk === null}
                onClick={() => onContinue(selfOk ?? false)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
