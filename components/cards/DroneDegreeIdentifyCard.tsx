"use client";

import { useEffect, useRef, useState } from "react";

import type { DroneDegreeIdentifyParams } from "@/lib/cards/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { startDroneMidi, stopDrone } from "@/lib/audio/drone";
import { playReferenceMidiNote } from "@/lib/audio/referenceNote";
import { useSettingsStore } from "@/lib/store/settingsStore";

/**
 * Build a sensible playable MIDI for a pitch class given a tonic. Picks the
 * lowest occurrence of the pitch class at-or-above the tonic, so degrees stay
 * within an octave above the drone.
 */
function midiAtPitchClassNearTonic(
  tonicMidi: number,
  pitchClass: number,
): number {
  const tonicPc = ((tonicMidi % 12) + 12) % 12;
  const offset = ((pitchClass - tonicPc) % 12 + 12) % 12;
  return tonicMidi + offset;
}

type PromptResult = "pending" | "correct" | "incorrect";

export function DroneDegreeIdentifyCard({
  params,
  onContinue,
}: {
  params: DroneDegreeIdentifyParams;
  onContinue: (correct: boolean) => void;
}) {
  const droneVol = useSettingsStore((s) => s.settings.droneVolume);
  const hydrated = useSettingsStore((s) => s.hydrated);

  const [step, setStep] = useState(0);
  const [results, setResults] = useState<PromptResult[]>(
    () => params.prompts.map(() => "pending"),
  );
  const [hasPlayed, setHasPlayed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showTransition, setShowTransition] = useState(true);
  const [droneActive, setDroneActive] = useState(false);
  const lastTonicRef = useRef<number | null>(null);

  const cur = params.prompts[step];
  const finished = step >= params.prompts.length;
  const correctCount = results.filter((r) => r === "correct").length;

  useEffect(() => {
    return () => {
      stopDrone();
    };
  }, []);

  useEffect(() => {
    setHasPlayed(false);
    setShowTransition(true);
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

  if (finished) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Round complete</CardTitle>
          <CardDescription>
            {correctCount} of {params.prompts.length} correct.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="rust"
            onClick={() => {
              stopDrone();
              onContinue(correctCount >= Math.ceil(params.prompts.length / 2));
            }}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  const ensureDroneFor = async (tonicMidi: number) => {
    if (lastTonicRef.current !== tonicMidi) {
      stopDrone();
      await startDroneMidi(tonicMidi, droneVol);
      lastTonicRef.current = tonicMidi;
      setDroneActive(true);
    } else if (!droneActive) {
      await startDroneMidi(tonicMidi, droneVol);
      setDroneActive(true);
    }
  };

  const playPrompt = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ensureDroneFor(cur.key.tonicMidi);
      const target = midiAtPitchClassNearTonic(
        cur.key.tonicMidi,
        cur.playedPitchClass,
      );
      await new Promise((r) => setTimeout(r, 250));
      await playReferenceMidiNote(target, {
        durationSec: 1.6,
        volumeLinear: 0.45,
      });
      setHasPlayed(true);
    } finally {
      setBusy(false);
    }
  };

  const submit = (chosenIndex: number) => {
    if (results[step] !== "pending") return;
    const ok = chosenIndex === cur.correctOptionIndex;
    setResults((prev) => {
      const next = [...prev];
      next[step] = ok ? "correct" : "incorrect";
      return next;
    });
    window.setTimeout(() => {
      if (step + 1 >= params.prompts.length) {
        setStep((s) => s + 1);
      } else {
        setStep((s) => s + 1);
      }
    }, 800);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{params.uiTitle ?? "Identify what you hear"}</CardTitle>
        <CardDescription>
          {params.uiDescription ??
            `Drone in ${cur.key.keyLabel}. ${step + 1} of ${params.prompts.length}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTransition && cur.transitionText ? (
          <p className="rounded-md border border-rust bg-paper-soft px-3 py-2 text-sm text-ink-soft">
            {cur.transitionText}
          </p>
        ) : null}

        <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
          <p className="mb-2 text-xs text-ink-mute">
            Drone: {cur.key.keyLabel}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="rust"
              disabled={busy}
              onClick={() => void playPrompt()}
            >
              {hasPlayed ? "Replay note" : "Play note"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopDrone();
                lastTonicRef.current = null;
                setDroneActive(false);
              }}
            >
              Stop drone
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {params.options.map((opt, i) => {
            const status = results[step];
            const isCorrect = i === cur.correctOptionIndex;
            const variant: "rust" | "outline" =
              status === "incorrect" && isCorrect
                ? "rust"
                : status !== "pending" && isCorrect
                  ? "rust"
                  : "outline";
            return (
              <Button
                key={`${step}-${i}`}
                type="button"
                variant={variant}
                disabled={!hasPlayed || status !== "pending"}
                onClick={() => submit(i)}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>

        {results[step] === "incorrect" ? (
          <p className="text-sm text-rust">
            Listen again — the highlighted answer is correct.
          </p>
        ) : null}
        {results[step] === "correct" ? (
          <p className="font-display text-2xl text-rust">Nice!</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
