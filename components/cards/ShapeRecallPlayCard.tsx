"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, RotateCcw, Lightbulb } from "lucide-react";

import type {
  ShapeLabelMode,
  ShapeRecallPlayParams,
  ShapeRecallStep,
} from "@/lib/cards/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Fretboard,
  type FretboardHighlight,
} from "@/components/fretboard/Fretboard";
import { LabelModeToggle } from "@/components/fretboard/LabelModeToggle";
import { useContinuousPitchListener } from "@/lib/audio/continuousPitch";
import { midiAtPosition } from "@/lib/fretboard/model";
import { midiToHashPitchLabel } from "@/lib/audio/noteUtils";
import { labelForStep } from "@/lib/fretboard/labelForStep";
import { windowForSteps } from "@/lib/fretboard/window";
import { playReferenceMidiNote } from "@/lib/audio/referenceNote";
import { useSettingsStore } from "@/lib/store/settingsStore";

type Phase = "idle" | "running" | "complete";

export function ShapeRecallPlayCard({
  params,
  onContinue,
}: {
  params: ShapeRecallPlayParams;
  onContinue: (correct: boolean, opts?: { usedHelp?: boolean }) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const leftHanded = useSettingsStore((s) => s.settings.leftHanded);

  const total = params.steps.length;

  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [hintFlash, setHintFlash] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [labelMode, setLabelMode] = useState<ShapeLabelMode>(
    params.defaultLabelMode ?? "none",
  );

  // Mirror step into a ref so the rAF callback inside the listener doesn't
  // capture a stale value mid-sequence.
  const stepRef = useRef(step);
  const settledRef = useRef(false);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const expected = step < total ? params.steps[step] ?? null : null;
  const expectedMidi = expected
    ? midiAtPosition(expected.stringIndex, expected.fret)
    : null;

  const playPreview = async () => {
    if (previewBusy) return;
    setPreviewBusy(true);
    try {
      for (const s of params.steps) {
        const m = midiAtPosition(s.stringIndex, s.fret);
        await playReferenceMidiNote(m, {
          durationSec: 0.45,
          volumeLinear: 0.35,
        });
        await new Promise((r) => setTimeout(r, 60));
      }
    } finally {
      setPreviewBusy(false);
    }
  };

  // Persisted across the whole card so a hint at any step counts.
  // (UI-state `usedHint` is also kept for the "Hint used." badge below.)
  const usedHintRef = useRef(false);

  const handleMatch = () => {
    if (settledRef.current) return;
    if (stepRef.current + 1 >= total) {
      settledRef.current = true;
      setStep(total);
      setPhase("complete");
      window.setTimeout(
        () => onContinue(true, { usedHelp: usedHintRef.current }),
        1200,
      );
      return;
    }
    setStep((s) => s + 1);
  };

  // Continuous mic. Active during the running phase only.
  // No `onWrongPitch` — wrong notes are ignored; user just keeps playing.
  const listener = useContinuousPitchListener({
    enabled: phase === "running" && pitchOn && expectedMidi != null,
    targetMidi: expectedMidi,
    targetGeneration: step,
    onMatch: handleMatch,
  });

  const restart = () => {
    if (phase === "complete") return;
    setStep(0);
    settledRef.current = false;
  };

  const hint = () => {
    setUsedHint(true);
    usedHintRef.current = true;
    setHintFlash(true);
    window.setTimeout(() => setHintFlash(false), 900);
  };

  const start = () => {
    setPhase("running");
    setStep(0);
    setUsedHint(false);
    usedHintRef.current = false;
    settledRef.current = false;
  };

  // Build highlights: every step is dim, completed steps are gold, the
  // current expected step is rust (and may briefly flash on hint). Tonic
  // notes (degree "1") get an underlying sage-green highlight so the
  // shape's roots are visible at a glance, except when they're the
  // current target or already played — those states take precedence so
  // the user always sees which note to play next. The per-cell `label`
  // is computed from the active label mode so flipping the toggle
  // re-renders without rebuilding the fretboard.
  const stepsRef = params.steps;
  const highlights = useMemo<FretboardHighlight[]>(() => {
    const decorate = (s: ShapeRecallStep) => ({
      stringIndex: s.stringIndex,
      fret: s.fret,
      label: labelForStep(s, labelMode),
    });
    const isTonic = (s: ShapeRecallStep) => s.degree === "1";
    if (phase === "idle") {
      return stepsRef.map((s) => ({
        ...decorate(s),
        variant: isTonic(s) ? ("tonic" as const) : ("dim" as const),
      }));
    }
    return stepsRef.map((s, i) => {
      if (i < step) return { ...decorate(s), variant: "success" as const };
      if (i === step) {
        return {
          ...decorate(s),
          variant: hintFlash ? ("warning" as const) : ("primary" as const),
        };
      }
      return {
        ...decorate(s),
        variant: isTonic(s) ? ("tonic" as const) : ("dim" as const),
      };
    });
  }, [stepsRef, step, phase, hintFlash, labelMode]);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-ink-mute">
          Loading…
        </CardContent>
      </Card>
    );
  }

  // Pick a tight window around the shape so the diagram keeps a constant
  // per-fret zoom level regardless of where on the neck the shape lives.
  // Shapes that touch open strings stay anchored at the nut.
  const { startFret: windowStart, maxFret: windowMax } = windowForSteps(
    params.steps,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{params.title}</CardTitle>
        <CardDescription>
          {phase === "idle"
            ? "Continuous listening. Wrong notes are ignored — just keep playing."
            : phase === "running"
              ? `Step ${Math.min(step + 1, total)} of ${total}.`
              : "Shape complete."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {params.intro ? (
          <p className="text-sm text-ink-soft">{params.intro}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            Labels
          </span>
          <LabelModeToggle value={labelMode} onChange={setLabelMode} />
        </div>

        <div
          className={
            phase === "complete" ? "rounded-md ring-2 ring-gold" : ""
          }
        >
          <Fretboard
            startFret={windowStart}
            maxFret={windowMax}
            highlights={highlights}
            leftHanded={leftHanded}
            aria-label={`${params.title} diagram`}
          />
        </div>

        {phase === "idle" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="rust"
              onClick={start}
              disabled={!pitchOn}
            >
              {pitchOn ? "Start — mic on" : "Mic disabled in Settings"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={previewBusy}
              onClick={() => void playPreview()}
            >
              {previewBusy ? "Playing…" : "Hear the shape"}
            </Button>
            {!pitchOn ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onContinue(true)}
              >
                Self-rated done
              </Button>
            ) : null}
          </div>
        ) : phase === "running" ? (
          <>
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
                  <span className="text-ink-soft">Requesting mic…</span>
                ) : null}
                {listener.phase === "listening" ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-ink-soft">
                      Mic on — play the rust-outlined note next (green dots are
                      the shape&apos;s roots). Wrong notes are ignored.
                    </span>
                    {expectedMidi != null ? (
                      <span className="text-xs text-ink-mute">
                        target {midiToHashPitchLabel(expectedMidi)}
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
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={restart}>
                <RotateCcw className="mr-1 h-4 w-4" strokeWidth={1.75} />
                Restart
              </Button>
              <Button type="button" variant="outline" onClick={hint}>
                <Lightbulb className="mr-1 h-4 w-4" strokeWidth={1.75} />
                Hint
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  settledRef.current = true;
                  onContinue(true, { usedHelp: usedHintRef.current });
                }}
              >
                Skip
              </Button>
              {usedHint ? (
                <span className="self-center text-xs text-ink-mute">
                  Hint used.
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <p className="font-display text-2xl text-rust">Shape complete!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
