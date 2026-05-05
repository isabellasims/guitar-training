"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ShapeRecallPlayCard } from "@/components/cards/ShapeRecallPlayCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SHAPES_BY_ID,
  semitoneOffsetForPitchClass,
  transposeSteps,
} from "@/lib/curriculum/shapeLibrary";
import { midiToHashPitchLabel } from "@/lib/audio/noteUtils";
import { cn } from "@/lib/utils";

const TONIC_PCS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export default function ScaleDrillPage() {
  const params = useParams<{ shapeId: string }>();
  const shape = SHAPES_BY_ID[params.shapeId];
  const [tonicPc, setTonicPc] = useState<number>(
    shape?.defaultRootPitchClass ?? 0,
  );
  const [round, setRound] = useState(0);

  const offset = useMemo(
    () =>
      shape && shape.transposable
        ? semitoneOffsetForPitchClass(shape, tonicPc)
        : 0,
    [shape, tonicPc],
  );

  const steps = useMemo(
    () => (shape ? transposeSteps(shape.steps, offset) : []),
    [shape, offset],
  );

  if (!shape) return notFound();

  const keyLabel = shape.transposable
    ? midiToHashPitchLabel(60 + tonicPc)
    : shape.defaultKeyLabel;

  return (
    <main className="px-4 py-8">
      <header className="mb-6">
        <Button asChild variant="ghost" className="px-0 text-rust">
          <Link href="/scales">← Scale Library</Link>
        </Button>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          {shape.category}
        </p>
        <h1 className="font-display text-3xl text-ink">{shape.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{shape.description}</p>
      </header>

      {shape.transposable ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Tonic — {keyLabel}</CardTitle>
            <CardDescription>
              Same fingering, slid to wherever you want home to be.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {TONIC_PCS.map((pc) => {
                const sel = pc === tonicPc;
                return (
                  <Button
                    key={pc}
                    type="button"
                    size="sm"
                    variant={sel ? "rust" : "outline"}
                    className={cn(
                      "min-w-[2.75rem] font-mono",
                      sel && "ring-2 ring-gold-soft",
                    )}
                    onClick={() => {
                      setTonicPc(pc);
                      setRound((r) => r + 1);
                    }}
                  >
                    {midiToHashPitchLabel(60 + pc)}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ShapeRecallPlayCard
        key={`${shape.id}-${round}-${tonicPc}`}
        params={{
          title: `${shape.name} · ${keyLabel}`,
          intro:
            "Continuous listening — wrong notes are ignored. Tap Done in the header to leave.",
          steps,
          restartOnError: true,
        }}
        onContinue={() => setRound((r) => r + 1)}
      />

      <div className="mt-6 flex justify-end">
        <Button asChild variant="outline">
          <Link href="/scales">Done</Link>
        </Button>
      </div>
    </main>
  );
}
