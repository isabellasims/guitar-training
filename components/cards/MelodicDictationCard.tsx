"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Play } from "lucide-react";

import type { MelodicDictationParams } from "@/lib/cards/types";
import { LessonDroneToggle } from "@/components/audio/LessonDroneToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  playReferenceMidiNote,
} from "@/lib/audio/referenceNote";
import { useContinuousPitchListener } from "@/lib/audio/continuousPitch";
import { midiToHashPitchLabel } from "@/lib/audio/noteUtils";
import { useSettingsStore } from "@/lib/store/settingsStore";

type Outcome = "pending" | "correct";

/**
 * Melodic dictation: app plays a short phrase, user plays it back by ear.
 * Notes are matched note-by-note in order, octave-equivalent (the pitch
 * listener compares pitch class). Hitting a wrong note is ignored — the
 * user keeps trying until the next correct note in the sequence lands.
 */
export function MelodicDictationCard({
  params,
  onContinue,
}: {
  params: MelodicDictationParams;
  onContinue: (correct: boolean, opts?: { usedHelp?: boolean }) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);

  const sequence = params.sequence;
  const total = sequence.length;
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"audition" | "playback">("audition");
  const [outcomes, setOutcomes] = useState<Outcome[]>(() =>
    sequence.map(() => "pending"),
  );
  const [showDegrees, setShowDegrees] = useState(false);
  const [selfOk, setSelfOk] = useState<boolean | null>(null);
  const [playingBack, setPlayingBack] = useState(false);
  // Whether the user revealed any hint (degree labels) — drops accuracy to 50%.
  const usedHintRef = useRef(false);
  // Re-entrance guard so a sustained note matched once doesn't double-advance.
  const matchedStepRef = useRef<number | null>(null);

  const noteDur = params.noteDurationSec ?? 0.6;
  const gapMs = params.gapMs ?? 120;

  const finished = step >= total;

  const playSequence = useCallback(async () => {
    if (playingBack) return;
    setPlayingBack(true);
    setPhase("audition");
    try {
      for (let i = 0; i < sequence.length; i++) {
        await playReferenceMidiNote(sequence[i]!, {
          durationSec: noteDur,
          volumeLinear: 0.5,
        });
        if (i < sequence.length - 1 && gapMs > 0) {
          await new Promise((res) => window.setTimeout(res, gapMs));
        }
      }
    } finally {
      setPlayingBack(false);
      setPhase("playback");
    }
  }, [playingBack, sequence, noteDur, gapMs]);

  // Auto-play the phrase once on mount. The user can replay any time.
  useEffect(() => {
    void playSequence();
    // Run-once intent — `playSequence` is stable enough that we don't want
    // to retrigger on every render. We deliberately exclude it from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = !finished ? sequence[step] : null;
  const armed = phase === "playback" && !playingBack && cur != null;

  const handlePitchMatch = useCallback(() => {
    if (matchedStepRef.current === step) return;
    matchedStepRef.current = step;
    setOutcomes((prev) => {
      const next = [...prev];
      next[step] = "correct";
      return next;
    });
    window.setTimeout(() => setStep((s) => s + 1), 350);
  }, [step]);

  useEffect(() => {
    setSelfOk(null);
    matchedStepRef.current = null;
  }, [step]);

  const listener = useContinuousPitchListener({
    enabled: Boolean(pitchOn && hydrated && armed),
    targetMidi: armed ? cur : null,
    targetGeneration: step,
    onMatch: handlePitchMatch,
    // Tighter gates than the default — we don't want the residual ring of
    // our own playback to count as the user's note.
    clarityMin: 0.82,
    consecutiveFramesNeeded: 3,
    rmsMin: 0.025,
    requireFreshAttack: "always",
    armingDelayMs: 350,
  });

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
    const correct = outcomes.filter((o) => o === "correct").length;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{params.uiTitle ?? "Phrase complete"}</CardTitle>
          <CardDescription>
            {correct} of {total} notes nailed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="rust"
            onClick={() =>
              onContinue(correct === total, {
                usedHelp: usedHintRef.current,
              })
            }
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleRevealDegrees = () => {
    setShowDegrees(true);
    usedHintRef.current = true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {params.uiTitle ?? `Melodic dictation — ${params.keyLabel}`}
        </CardTitle>
        <CardDescription>
          {params.uiDescription ??
            `Hear ${total} notes, play them back in order. The mic listens for each note as you go.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void playSequence()}
            disabled={playingBack}
            aria-label="Replay the phrase"
          >
            <Play className="mr-1 h-4 w-4" strokeWidth={1.75} />
            {playingBack ? "Playing…" : "Replay phrase"}
          </Button>
          <p className="text-sm text-ink-soft">
            Note {Math.min(step + 1, total)} of {total}
          </p>
        </div>

        {params.droneEnabled ? (
          <LessonDroneToggle
            tonicMidi={params.tonicMidi}
            keyLabel={params.keyLabel}
            micListening={
              pitchOn &&
              armed &&
              (listener.phase === "listening" ||
                listener.phase === "requesting")
            }
          />
        ) : null}

        {params.degreeLabels && params.degreeLabels.length > 0 ? (
          <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
            {!showDegrees ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-ink-soft">
                  Stuck? Reveal the scale-degree names. Counts as
                  &ldquo;needed help&rdquo;.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRevealDegrees}
                >
                  Show degrees
                </Button>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-xs text-ink-mute">
                  The phrase, in scale degrees:
                </p>
                <p className="font-display text-xl text-ink">
                  {params.degreeLabels.join(" → ")}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {pitchOn ? (
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
              {phase === "audition" || playingBack ? (
                <span className="text-ink-soft">
                  Listen — mic opens once playback finishes.
                </span>
              ) : null}
              {phase === "playback" && !playingBack ? (
                listener.phase === "requesting" ? (
                  <span className="text-ink-soft">Opening microphone…</span>
                ) : listener.phase === "listening" ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-ink-soft">
                      Mic on — play the next note. Wrong notes are ignored.
                    </span>
                    {cur != null ? (
                      <span className="text-xs text-ink-mute">
                        target {midiToHashPitchLabel(cur)}
                        {listener.liveMidi != null
                          ? ` · heard ${midiToHashPitchLabel(listener.liveMidi)}`
                          : ""}
                      </span>
                    ) : null}
                  </div>
                ) : listener.phase === "error" ? (
                  <span className="text-rust">{listener.error}</span>
                ) : (
                  <span className="text-ink-soft">Starting mic…</span>
                )
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
            <p className="mb-2 text-sm text-ink-soft">
              Pitch detection is off — self-check this phrase.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selfOk === true ? "rust" : "outline"}
                onClick={() => setSelfOk(true)}
              >
                I played the phrase cleanly
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
                onClick={() =>
                  onContinue(selfOk === true, {
                    usedHelp: usedHintRef.current,
                  })
                }
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {outcomes[step] === "correct" ? (
          <p className="font-display text-2xl text-rust">Got it!</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
