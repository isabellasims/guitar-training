"use client";

import { useEffect, useRef, useState } from "react";

import type { ChordChangeIdentifyParams } from "@/lib/cards/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  playChordSequence,
  type ChordSynthHandle,
} from "@/lib/audio/chordSynth";

type PromptResult = "pending" | "correct" | "incorrect";

export function ChordChangeIdentifyCard({
  params,
  onContinue,
}: {
  params: ChordChangeIdentifyParams;
  onContinue: (correct: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<PromptResult[]>(
    () => params.prompts.map(() => "pending"),
  );
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const handleRef = useRef<ChordSynthHandle | null>(null);

  const cur = params.prompts[step];
  const finished = step >= params.prompts.length;
  const correctCount = results.filter((r) => r === "correct").length;

  useEffect(() => {
    return () => {
      handleRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    setHasPlayed(false);
    handleRef.current?.cancel();
    handleRef.current = null;
  }, [step]);

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
            onClick={() =>
              onContinue(correctCount >= Math.ceil(params.prompts.length / 2))
            }
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  const playProgression = async () => {
    if (playing) return;
    handleRef.current?.cancel();
    setPlaying(true);
    const handle = playChordSequence(cur.chords, { chordDurationSec: 1.4 });
    handleRef.current = handle;
    try {
      await handle.promise;
      setHasPlayed(true);
    } finally {
      setPlaying(false);
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
    window.setTimeout(() => setStep((s) => s + 1), 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{params.uiTitle ?? "Hear the changes"}</CardTitle>
        <CardDescription>
          {params.uiDescription ??
            `${cur.keyLabel}. ${step + 1} of ${params.prompts.length}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cur.transitionText ? (
          <p className="rounded-md border border-rust bg-paper-soft px-3 py-2 text-sm text-ink-soft">
            {cur.transitionText}
          </p>
        ) : (
          <p className="text-sm text-ink-soft">
            Listen for chord {cur.askPositionIndex} in the progression.
          </p>
        )}

        <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
          <Button
            type="button"
            variant="rust"
            disabled={playing}
            onClick={() => void playProgression()}
          >
            {playing
              ? "Playing…"
              : hasPlayed
                ? "Replay progression"
                : "Play progression"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {params.options.map((opt, i) => {
            const status = results[step];
            const isCorrect = i === cur.correctOptionIndex;
            const variant: "rust" | "outline" =
              status !== "pending" && isCorrect ? "rust" : "outline";
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
            Listen again — the correct answer is highlighted.
          </p>
        ) : null}
        {results[step] === "correct" ? (
          <p className="font-display text-2xl text-rust">Nice!</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
