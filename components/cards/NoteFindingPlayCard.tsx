"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import type { NoteFindingPlayParams } from "@/lib/cards/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Fretboard } from "@/components/fretboard/Fretboard";
import { useContinuousPitchListener } from "@/lib/audio/continuousPitch";
import {
  midiAtPosition,
  type StringIndex,
} from "@/lib/fretboard/model";
import {
  parseNoteNameToPitchClass,
  stringIndexToPedagogyLabel,
  targetMidiNoteOnString,
} from "@/lib/fretboard/noteFinding";
import { useSettingsStore } from "@/lib/store/settingsStore";

const STRING_ORDER: StringIndex[] = [5, 4, 3, 2, 1, 0];

type Round = {
  noteName: string;
  stringIndex: StringIndex;
  /** Lowest matching MIDI in 0–12 frets — used as the "canonical" fret target. */
  midi: number;
  /** All frets 0–12 on this string that match the requested pitch class. */
  validFrets: number[];
};

function validFretsForPitchClass(
  stringIndex: StringIndex,
  pitchClass: number,
): number[] {
  const out: number[] = [];
  for (let f = 0; f <= 12; f++) {
    const midi = midiAtPosition(stringIndex, f);
    if (((midi % 12) + 12) % 12 === pitchClass) out.push(f);
  }
  return out;
}

function makeRound(
  noteName: string,
  stringIndex: StringIndex,
): Round | null {
  const pc = parseNoteNameToPitchClass(noteName);
  if (pc === null) return null;
  const m = targetMidiNoteOnString(noteName, stringIndex);
  if (m == null) return null;
  return {
    noteName,
    stringIndex,
    midi: m,
    validFrets: validFretsForPitchClass(stringIndex, pc),
  };
}

function buildRounds(params: NoteFindingPlayParams): Round[] {
  // Random-rounds mode: pool + roundCount.
  if (params.pool && params.roundCount && params.roundCount > 0) {
    const notes = params.pool.notes;
    const strings = params.pool.stringIndices ?? STRING_ORDER;
    const out: Round[] = [];
    for (let i = 0; i < params.roundCount; i++) {
      const note = notes[Math.floor(Math.random() * notes.length)]!;
      const si = strings[Math.floor(Math.random() * strings.length)]!;
      const r = makeRound(note, si);
      if (r) out.push(r);
    }
    return out;
  }
  // Targeted mode: noteName + stringIndex / allStringsLowestFret.
  const noteName = params.noteName;
  if (!noteName) return [];

  const stringIdxs: StringIndex[] = params.allStringsLowestFret
    ? STRING_ORDER
    : params.stringIndex !== undefined
      ? [params.stringIndex]
      : [];

  const rounds: Round[] = [];
  for (const si of stringIdxs) {
    const r = makeRound(noteName, si);
    if (r) rounds.push(r);
  }
  return rounds;
}

type Mode = "play" | "tap";

export function NoteFindingPlayCard({
  params,
  onContinue,
}: {
  params: NoteFindingPlayParams;
  onContinue: (correct: boolean) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const leftHanded = useSettingsStore((s) => s.settings.leftHanded);

  const rounds = useMemo(() => buildRounds(params), [params]);
  const [step, setStep] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<"" | "nice" | "miss">("");
  const [mode, setMode] = useState<Mode>(pitchOn ? "play" : "tap");
  const [micEnabled, setMicEnabled] = useState(false);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current != null) {
        window.clearTimeout(advanceTimer.current);
      }
    };
  }, []);

  const cur = rounds[step];
  const total = rounds.length;
  const isLast = step + 1 >= total;
  const finished = step >= total;

  const advance = (wasCorrect: boolean) => {
    if (advanceTimer.current != null) {
      window.clearTimeout(advanceTimer.current);
    }
    if (wasCorrect) setCorrectCount((c) => c + 1);
    if (isLast) {
      setStep((s) => s + 1);
      // Slight delay so the user sees the "Nice!" before we hand back.
      advanceTimer.current = window.setTimeout(() => {
        const passed = (wasCorrect ? correctCount + 1 : correctCount) >= Math.ceil(total * 0.6);
        onContinue(passed);
      }, 700);
    } else {
      advanceTimer.current = window.setTimeout(() => {
        setStep((s) => s + 1);
        setFeedback("");
      }, 600);
    }
  };

  const handlePitchMatch = () => {
    if (feedback === "nice") return;
    setFeedback("nice");
    advance(true);
  };

  const handleFretTap = (s: number, f: number) => {
    if (!cur || feedback === "nice") return;
    if (s !== cur.stringIndex) {
      setFeedback("miss");
      window.setTimeout(() => setFeedback(""), 500);
      return;
    }
    if (cur.validFrets.includes(f)) {
      setFeedback("nice");
      advance(true);
    } else {
      setFeedback("miss");
      window.setTimeout(() => setFeedback(""), 500);
    }
  };

  const listener = useContinuousPitchListener({
    enabled: mode === "play" && micEnabled && !finished,
    targetMidi: mode === "play" && cur ? cur.midi : null,
    onMatch: handlePitchMatch,
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

  if (rounds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Note finding</CardTitle>
          <CardDescription>Card is misconfigured.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => onContinue(false)}
          >
            Skip
          </Button>
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
            {correctCount} of {total} correct.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-soft">Returning to the session…</p>
        </CardContent>
      </Card>
    );
  }

  const stringDesc = stringIndexToPedagogyLabel(cur.stringIndex);
  const correctHighlights =
    feedback === "nice"
      ? cur.validFrets.map((f) => ({ stringIndex: cur.stringIndex, fret: f }))
      : [];

  const cardTitle = params.pool
    ? "Note finding — random rounds"
    : params.allStringsLowestFret
      ? `Find ${params.noteName} on each string`
      : `Find ${params.noteName ?? "the note"}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>
          Round {step + 1} of {total} · {correctCount} correct so far.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            Mode
          </span>
          <Button
            type="button"
            size="sm"
            variant={mode === "play" ? "rust" : "outline"}
            onClick={() => setMode("play")}
          >
            Play (mic)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "tap" ? "rust" : "outline"}
            onClick={() => {
              setMode("tap");
              setMicEnabled(false);
            }}
          >
            Tap (no guitar)
          </Button>
        </div>

        <p className="text-base text-ink">
          Find{" "}
          <span className="font-display text-4xl text-rust">
            {cur.noteName}
          </span>{" "}
          on the{" "}
          <span className="font-semibold">
            {params.pool ? stringDesc : params.stringDescription ?? stringDesc}
          </span>
          .
        </p>
        <p className="text-xs text-ink-mute">
          Wrong notes are ignored — just keep playing until you hit the right
          one. The fret highlights when you do.
        </p>

        <Fretboard
          maxFret={12}
          highlights={correctHighlights}
          showNoteLabels={mode === "tap"}
          leftHanded={leftHanded}
          onFretTap={mode === "tap" ? handleFretTap : undefined}
          aria-label={`Fretboard — ${stringDesc}`}
        />

        {mode === "play" ? (
          <div className="space-y-2">
            {!micEnabled ? (
              <Button
                type="button"
                variant="rust"
                onClick={() => setMicEnabled(true)}
              >
                Allow mic and start round
              </Button>
            ) : null}
            {micEnabled ? (
              <div
                className="flex items-center gap-3 rounded-md border border-rule bg-paper-soft px-3 py-2"
                role="status"
                aria-live="polite"
              >
                {listener.phase === "listening" ? (
                  <Mic
                    className="h-5 w-5 shrink-0 text-rust"
                    strokeWidth={1.75}
                  />
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
                      Mic on — play any {cur.noteName} on the {stringDesc}.
                    </span>
                  ) : null}
                  {listener.phase === "error" ? (
                    <span className="text-rust">{listener.error}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-ink-mute">
            Tap any fret on the highlighted string. Wrong fret flashes red.
          </p>
        )}

        {feedback === "nice" ? (
          <p className="font-display text-2xl text-rust">Nice!</p>
        ) : null}
        {feedback === "miss" ? (
          <p className="text-sm text-rust">Not that one — try again.</p>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFeedback("");
              if (isLast) {
                setStep((s) => s + 1);
                onContinue(correctCount >= Math.ceil(total * 0.6));
              } else {
                setStep((s) => s + 1);
              }
            }}
          >
            Skip note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
