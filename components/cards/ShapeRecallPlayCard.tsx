"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, RotateCcw, Lightbulb } from "lucide-react";

import type { ShapeRecallPlayParams } from "@/lib/cards/types";
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
import { useContinuousPitchListener } from "@/lib/audio/continuousPitch";
import { midiAtPosition } from "@/lib/fretboard/model";
import { playReferenceMidiNote } from "@/lib/audio/referenceNote";
import { useSettingsStore } from "@/lib/store/settingsStore";

type Phase = "idle" | "running" | "complete";

export function ShapeRecallPlayCard({
  params,
  onContinue,
}: {
  params: ShapeRecallPlayParams;
  onContinue: (correct: boolean) => void;
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

  const handleMatch = () => {
    if (settledRef.current) return;
    if (stepRef.current + 1 >= total) {
      settledRef.current = true;
      setStep(total);
      setPhase("complete");
      window.setTimeout(() => onContinue(true), 1200);
      return;
    }
    setStep((s) => s + 1);
  };

  // Continuous mic. Active during the running phase only.
  // No `onWrongPitch` — wrong notes are ignored; user just keeps playing.
  const listener = useContinuousPitchListener({
    enabled: phase === "running" && pitchOn && expectedMidi != null,
    targetMidi: expectedMidi,
    onMatch: handleMatch,
  });

  const restart = () => {
    if (phase === "complete") return;
    setStep(0);
    settledRef.current = false;
  };

  const hint = () => {
    setUsedHint(true);
    setHintFlash(true);
    window.setTimeout(() => setHintFlash(false), 900);
  };

  const start = () => {
    setPhase("running");
    setStep(0);
    setUsedHint(false);
    settledRef.current = false;
  };

  // Build highlights: every step is dim, completed steps are green, the
  // current expected step is rust (and may briefly flash on hint).
  const highlights = useMemo<FretboardHighlight[]>(() => {
    if (phase === "idle") {
      return params.steps.map((s) => ({
        stringIndex: s.stringIndex,
        fret: s.fret,
        variant: "dim" as const,
      }));
    }
    return params.steps.map((s, i) => {
      if (i < step) {
        return { ...s, variant: "success" as const };
      }
      if (i === step) {
        return {
          ...s,
          variant: hintFlash ? ("warning" as const) : ("primary" as const),
        };
      }
      return { ...s, variant: "dim" as const };
    });
  }, [params.steps, step, phase, hintFlash]);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-ink-mute">
          Loading…
        </CardContent>
      </Card>
    );
  }

  const maxFretInShape = params.steps.reduce((m, s) => Math.max(m, s.fret), 0);

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

        <div
          className={
            phase === "complete" ? "rounded-md ring-2 ring-gold" : ""
          }
        >
          <Fretboard
            maxFret={Math.max(5, maxFretInShape + 2)}
            highlights={highlights}
            showNoteLabels
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
                  <span className="text-ink-soft">
                    Mic on — play the rust-colored note next. Wrong notes are
                    ignored.
                  </span>
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
                  onContinue(true);
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
