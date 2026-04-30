"use client";

import { useState } from "react";

import type { FunctionalEarMcParams } from "@/lib/cards/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FunctionalEarMcCard({
  params,
  onContinue,
}: {
  params: FunctionalEarMcParams;
  onContinue: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  const locked = picked !== null;
  const correct = picked === params.correctIndex;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ear check</CardTitle>
        <CardDescription>Tap the best answer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base text-ink">{params.question}</p>
        <ul className="space-y-2">
          {params.choices.map((c, i) => {
            const isSel = picked === i;
            const isRight = i === params.correctIndex;
            const show = locked;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setPicked(i)}
                  className={cn(
                    "w-full rounded-md border px-4 py-3 text-left text-sm transition-colors",
                    !show && "border-rule bg-paper-soft hover:bg-paper-deep",
                    show &&
                      isRight &&
                      "border-gold bg-gold-soft/40 text-ink",
                    show && isSel && !isRight && "border-rust bg-rust/10 text-ink",
                    show && !isSel && !isRight && "border-rule opacity-60",
                  )}
                >
                  {c}
                </button>
              </li>
            );
          })}
        </ul>
        {locked ? (
          <p className="text-sm text-ink-soft">{params.afterText}</p>
        ) : null}
        {locked ? (
          <Button
            type="button"
            variant="rust"
            onClick={() => onContinue(correct)}
          >
            Continue
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
