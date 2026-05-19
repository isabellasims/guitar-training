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
import {
  Fretboard,
  type FretboardHighlight,
} from "@/components/fretboard/Fretboard";
import { ShowPositionsToggle } from "@/components/cards/ShowPositionsToggle";
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
const ALL_STRINGS: StringIndex[] = [0, 1, 2, 3, 4, 5];

/**
 * Every (string, fret) position in 0..maxFret where the given pitch class
 * sounds. Used to draw "Show positions" hints across the whole neck.
 */
function allPositionsForPitchClass(
  pitchClass: number,
  maxFret: number,
): { stringIndex: StringIndex; fret: number }[] {
  const out: { stringIndex: StringIndex; fret: number }[] = [];
  for (const s of ALL_STRINGS) {
    for (let f = 0; f <= maxFret; f++) {
      const midi = midiAtPosition(s, f);
      if (((midi % 12) + 12) % 12 === pitchClass) {
        out.push({ stringIndex: s, fret: f });
      }
    }
  }
  return out;
}

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
  if (
    params.allStringsProgressiveTwoPerString &&
    params.allStringsLowestFret &&
    params.noteName
  ) {
    return [];
  }
  // Random-rounds mode: pool + roundCount.
  if (params.pool && params.roundCount && params.roundCount > 0) {
    const notes = params.pool.notes;
    const strings = params.pool.stringIndices ?? STRING_ORDER;
    const out: Round[] = [];
    // Avoid two consecutive rounds with the same pitch-class target. When the
    // listener sees the same target MIDI twice in a row, its "already matched
    // this target" ref blocks the second match and the user gets stuck. We
    // give up after a few attempts so a tiny pool (1 note × 1 string) still
    // produces a session — but in normal pools this guarantees no repeats.
    for (let i = 0; i < params.roundCount; i++) {
      let r: Round | null = null;
      for (let attempt = 0; attempt < 8 && r == null; attempt++) {
        const note = notes[Math.floor(Math.random() * notes.length)]!;
        const si = strings[Math.floor(Math.random() * strings.length)]!;
        const candidate = makeRound(note, si);
        if (!candidate) continue;
        const prev = out[out.length - 1];
        if (prev && prev.midi === candidate.midi) continue;
        r = candidate;
      }
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
  onContinue: (correct: boolean, opts?: { usedHelp?: boolean }) => void;
}) {
  const pitchOn = useSettingsStore((s) => s.settings.pitchDetectionEnabled);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const leftHanded = useSettingsStore((s) => s.settings.leftHanded);

  const rounds = useMemo(() => buildRounds(params), [params]);
  const progressive =
    !!(
      params.allStringsProgressiveTwoPerString &&
      params.allStringsLowestFret &&
      params.noteName
    );
  const [step, setStep] = useState(0);
  const [progStep, setProgStep] = useState(0);
  const [listenerEpoch, setListenerEpoch] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<"" | "nice" | "miss">("");
  const [mode, setMode] = useState<Mode>(pitchOn ? "play" : "tap");
  const [micEnabled, setMicEnabled] = useState(false);
  // "Show positions" toggle: per-prompt, always starts off. If the user
  // ever flips it on during the card, we mark the whole card as
  // hint-assisted (50% accuracy credit).
  const [showPositions, setShowPositions] = useState(false);
  const [micArmed, setMicArmed] = useState(false);
  const usedHintRef = useRef(false);
  const advanceTimer = useRef<number | null>(null);
  const progressiveSuccessRef = useRef(0);
  const feedbackRef = useRef<"" | "nice" | "miss">("");

  useEffect(() => {
    if (pitchOn && mode === "play" && hydrated) {
      setMicEnabled(true);
    }
  }, [pitchOn, mode, hydrated]);

  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current != null) {
        window.clearTimeout(advanceTimer.current);
      }
    };
  }, []);

  const progressiveGoal = 12;

  const cur = useMemo(() => {
    if (progressive && params.noteName) {
      if (progStep >= progressiveGoal) return null;
      const idx = Math.min(5, Math.floor(progStep / 2));
      return makeRound(params.noteName, STRING_ORDER[idx]!);
    }
    return rounds[step] ?? null;
  }, [progressive, params.noteName, progStep, rounds, step, progressiveGoal]);

  useEffect(() => {
    setMicArmed(false);
    const tid = window.setTimeout(() => setMicArmed(true), 140);
    return () => window.clearTimeout(tid);
  }, [listenerEpoch, step, progStep, cur?.midi, progressive]);

  const total = progressive ? progressiveGoal : rounds.length;
  const isLast = progressive
    ? progStep + 1 >= progressiveGoal
    : step + 1 >= total;
  const finished = progressive ? progStep >= progressiveGoal : step >= total;

  const advance = (wasCorrect: boolean) => {
    if (advanceTimer.current != null) {
      window.clearTimeout(advanceTimer.current);
    }
    if (progressive) {
      advanceTimer.current = window.setTimeout(() => {
        setFeedback("");
        setShowPositions(false);
        setListenerEpoch((e) => e + 1);
        if (wasCorrect) {
          progressiveSuccessRef.current += 1;
          setCorrectCount(progressiveSuccessRef.current);
          setProgStep((ps) => {
            const ns = ps + 1;
            if (ns >= progressiveGoal) {
              window.setTimeout(() => {
                onContinue(
                  progressiveSuccessRef.current >=
                    Math.ceil(progressiveGoal * 0.6),
                  { usedHelp: usedHintRef.current },
                );
              }, 500);
            }
            return ns;
          });
        }
      }, 600);
      return;
    }
    if (wasCorrect) setCorrectCount((c) => c + 1);
    if (isLast) {
      setStep((s) => s + 1);
      advanceTimer.current = window.setTimeout(() => {
        const passed =
          (wasCorrect ? correctCount + 1 : correctCount) >=
          Math.ceil(total * 0.6);
        onContinue(passed, { usedHelp: usedHintRef.current });
      }, 700);
    } else {
      advanceTimer.current = window.setTimeout(() => {
        setStep((s) => s + 1);
        setFeedback("");
        setShowPositions(false);
        setListenerEpoch((e) => e + 1);
      }, 600);
    }
  };

  const handleShowPositionsChange = (next: boolean) => {
    setShowPositions(next);
    if (next) usedHintRef.current = true;
  };

  const handlePitchMatch = () => {
    if (feedbackRef.current === "nice") return;
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
    enabled:
      mode === "play" &&
      micEnabled &&
      !finished &&
      cur != null &&
      feedback === "" &&
      micArmed,
    targetMidi: mode === "play" && cur ? cur.midi : null,
    targetGeneration: listenerEpoch,
    onMatch: handlePitchMatch,
    clarityMin: 0.78,
    consecutiveFramesNeeded: 2,
    rmsMin: 0.014,
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

  if (!progressive && rounds.length === 0) {
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

  if (!cur) {
    return null;
  }

  const stringDesc = stringIndexToPedagogyLabel(cur.stringIndex);
  const targetPc = ((cur.midi % 12) + 12) % 12;

  // Layered highlights, drawn in order — later layers override earlier ones
  // for the same cell:
  //   1. "Show positions" — every position of the target pitch class on the
  //      whole neck, drawn as dim hints.
  //   2. The user's correct play — the matching fret on the prompt's
  //      string, drawn as success.
  const highlights: FretboardHighlight[] = [];
  if (showPositions) {
    for (const p of allPositionsForPitchClass(targetPc, 12)) {
      highlights.push({ ...p, variant: "dim" });
    }
  }
  if (feedback === "nice") {
    for (const f of cur.validFrets) {
      highlights.push({
        stringIndex: cur.stringIndex,
        fret: f,
        variant: "success",
      });
    }
  }

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
          {progressive ? (
            <>
              Step {Math.min(progStep + 1, progressiveGoal)} of{" "}
              {progressiveGoal} (each string twice, low E → high e) ·{" "}
              {correctCount} correct so far.
            </>
          ) : (
            <>
              Round {step + 1} of {total} · {correctCount} correct so far.
            </>
          )}
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

        <ShowPositionsToggle
          enabled={showPositions}
          onChange={handleShowPositionsChange}
          emphasis={params.hintEmphasis}
        />

        <Fretboard
          maxFret={12}
          highlights={highlights}
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
              setShowPositions(false);
              setListenerEpoch((e) => e + 1);
              if (progressive) {
                if (advanceTimer.current != null) {
                  window.clearTimeout(advanceTimer.current);
                  advanceTimer.current = null;
                }
                setProgStep((ps) => {
                  const curStr = Math.min(5, Math.floor(ps / 2));
                  const next = Math.min(progressiveGoal, (curStr + 1) * 2);
                  if (next >= progressiveGoal) {
                    window.setTimeout(() => {
                      onContinue(
                        progressiveSuccessRef.current >=
                          Math.ceil(progressiveGoal * 0.6),
                        { usedHelp: usedHintRef.current },
                      );
                    }, 400);
                  }
                  return next;
                });
                return;
              }
              if (isLast) {
                setStep((s) => s + 1);
                onContinue(correctCount >= Math.ceil(total * 0.6), {
                  usedHelp: usedHintRef.current,
                });
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
