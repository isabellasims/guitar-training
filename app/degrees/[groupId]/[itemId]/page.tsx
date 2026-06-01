"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { DroneDegreeIdentifyCard } from "@/components/cards/DroneDegreeIdentifyCard";
import { DroneDegreePlayCard } from "@/components/cards/DroneDegreePlayCard";
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
  buildDegreeDrillParams,
  buildDegreeIdentifyParams,
  DEGREE_DRILL_GROUPS,
  findDegreeDrillItem,
  type DegreeIdentifyDrillItem,
  type DegreePlayDrillItem,
} from "@/lib/curriculum/degreeDrillLibrary";
import { cn } from "@/lib/utils";

const TONIC_PCS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export default function DegreeDrillPage() {
  const params = useParams<{ groupId: string; itemId: string }>();
  const item = findDegreeDrillItem(params.groupId, params.itemId);
  const group = DEGREE_DRILL_GROUPS.find((g) => g.id === params.groupId);
  const [tonicPc, setTonicPc] = useState<number>(() => {
    if (!item) return 0;
    return ((item.baseTonicMidi % 12) + 12) % 12;
  });
  const [round, setRound] = useState(0);

  const builtPlay = useMemo(
    () =>
      item?.kind === "play"
        ? buildDegreeDrillParams(item as DegreePlayDrillItem, tonicPc)
        : null,
    [item, tonicPc],
  );

  const builtIdentify = useMemo(
    () =>
      item?.kind === "identify"
        ? buildDegreeIdentifyParams(item as DegreeIdentifyDrillItem, tonicPc)
        : // eslint-disable-next-line react-hooks/exhaustive-deps
          null,
    [item, tonicPc, round],
  );

  if (!item || !group) return notFound();
  if (item.kind === "play" && (!builtPlay || builtPlay.prompts.length === 0)) {
    return notFound();
  }
  if (item.kind === "identify" && !builtIdentify) return notFound();

  const isIdentify = item.kind === "identify";

  return (
    <main className="px-4 py-8">
      <header className="mb-6">
        <Button asChild variant="ghost" className="px-0 text-rust">
          <Link href="/degrees">← Scale degree library</Link>
        </Button>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          {group.name} · {isIdentify ? "Listen & identify" : "Play over drone"}
        </p>
        <h1 className="font-display text-3xl text-ink">{item.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Tonic — {midiToHashPitchLabel(60 + tonicPc)}</CardTitle>
          <CardDescription>
            Transposes every prompt for this drill. The drone follows the key you
            pick ({item.mode}).
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

      {isIdentify && builtIdentify ? (
        <DroneDegreeIdentifyCard
          key={`${group.id}-${item.id}-${round}-${tonicPc}`}
          params={builtIdentify}
          onContinue={() => setRound((r) => r + 1)}
        />
      ) : builtPlay ? (
        <DroneDegreePlayCard
          key={`${group.id}-${item.id}-${round}-${tonicPc}`}
          params={builtPlay}
          onContinue={() => setRound((r) => r + 1)}
        />
      ) : null}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setRound((r) => r + 1)}>
          New round
        </Button>
        <Button asChild variant="rust">
          <Link href="/degrees">Done</Link>
        </Button>
      </div>
    </main>
  );
}
