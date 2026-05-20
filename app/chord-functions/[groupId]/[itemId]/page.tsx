"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ChordChangeIdentifyCard } from "@/components/cards/ChordChangeIdentifyCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { midiToHashPitchLabel } from "@/lib/audio/noteUtils";
import {
  buildChordFunctionIdentifyParams,
  CHORD_FUNCTION_GROUPS,
  findChordFunctionDrillItem,
} from "@/lib/curriculum/chordFunctionLibrary";
import { cn } from "@/lib/utils";

const TONIC_PCS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export default function ChordFunctionDrillPage() {
  const params = useParams<{ groupId: string; itemId: string }>();
  const item = findChordFunctionDrillItem(params.groupId, params.itemId);
  const group = CHORD_FUNCTION_GROUPS.find((g) => g.id === params.groupId);
  // Default to C major / A minor depending on the drill's mode.
  const [tonicPc, setTonicPc] = useState<number>(() => {
    if (!item) return 0;
    return item.mode === "major" ? 0 : 9;
  });
  const [round, setRound] = useState(0);

  const built = useMemo(
    () => (item ? buildChordFunctionIdentifyParams(item, tonicPc) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item, tonicPc, round],
  );

  if (!item || !group || !built) return notFound();

  return (
    <main className="px-4 py-8">
      <header className="mb-6">
        <Button asChild variant="ghost" className="px-0 text-rust">
          <Link href="/chord-functions">← Chord function library</Link>
        </Button>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          {group.name}
        </p>
        <h1 className="font-display text-3xl text-ink">{item.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            Tonic — {midiToHashPitchLabel(60 + tonicPc)} {item.mode}
          </CardTitle>
          <CardDescription>
            Transposes every progression. The function pool stays the same.
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

      <ChordChangeIdentifyCard
        key={`${group.id}-${item.id}-${round}-${tonicPc}`}
        params={built}
        onContinue={() => setRound((r) => r + 1)}
      />

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setRound((r) => r + 1)}>
          New round
        </Button>
        <Button asChild variant="rust">
          <Link href="/chord-functions">Done</Link>
        </Button>
      </div>
    </main>
  );
}
