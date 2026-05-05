"use client";

import { useEffect, useState } from "react";

import type { IntervalIdentifyParams } from "@/lib/cards/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { playReferenceMidiNote } from "@/lib/audio/referenceNote";

type PromptResult = "pending" | "correct" | "incorrect";

export function IntervalIdentifyCard({
  params,
  onContinue,
}: {
  params: IntervalIdentifyParams;
  onContinue: (correct: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<PromptResult[]>(
    () => params.prompts.map(() => "pending"),
  );
  const [hasPlayed, setHasPlayed] = useState(false);
  const [busy, setBusy] = useState(false);

  const cur = params.prompts[step];
  const finished = step >= params.prompts.length;
  const correctCount = results.filter((r) => r === "correct").length;

  useEffect(() => {
    setHasPlayed(false);
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

  const playInterval = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const offset = cur.direction === "up" ? cur.semitones : -cur.semitones;
      const second = cur.baseMidi + offset;
      await playReferenceMidiNote(cur.baseMidi, {
        durationSec: 0.7,
        volumeLinear: 0.4,
      });
      await new Promise((r) => setTimeout(r, 80));
      await playReferenceMidiNote(second, {
        durationSec: 0.9,
        volumeLinear: 0.4,
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
    window.setTimeout(() => setStep((s) => s + 1), 900);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{params.uiTitle ?? "Identify the interval"}</CardTitle>
        <CardDescription>
          {params.uiDescription ??
            `${step + 1} of ${params.prompts.length}. Listen, then pick.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-rule bg-paper-soft px-3 py-3">
          <Button
            type="button"
            variant="rust"
            disabled={busy}
            onClick={() => void playInterval()}
          >
            {busy ? "Playing…" : hasPlayed ? "Replay" : "Play interval"}
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
            That was a {cur.actualLabel}. The correct answer is highlighted.
          </p>
        ) : null}
        {results[step] === "correct" ? (
          <p className="font-display text-2xl text-rust">Nice!</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
