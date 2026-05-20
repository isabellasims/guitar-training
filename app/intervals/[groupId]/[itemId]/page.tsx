"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { IntervalIdentifyCard } from "@/components/cards/IntervalIdentifyCard";
import { Button } from "@/components/ui/button";
import {
  buildIntervalIdentifyParams,
  findIntervalDrillItem,
  INTERVAL_DRILL_GROUPS,
} from "@/lib/curriculum/intervalLibrary";

export default function IntervalDrillPage() {
  const params = useParams<{ groupId: string; itemId: string }>();
  const item = findIntervalDrillItem(params.groupId, params.itemId);
  const group = INTERVAL_DRILL_GROUPS.find((g) => g.id === params.groupId);
  const [round, setRound] = useState(0);

  const built = useMemo(
    // Regenerate prompts whenever `round` bumps so "New round" produces
    // a fresh randomized sequence.
    () => (item ? buildIntervalIdentifyParams(item) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item, round],
  );

  if (!item || !group || !built) return notFound();

  return (
    <main className="px-4 py-8">
      <header className="mb-6">
        <Button asChild variant="ghost" className="px-0 text-rust">
          <Link href="/intervals">← Interval library</Link>
        </Button>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          {group.name}
        </p>
        <h1 className="font-display text-3xl text-ink">{item.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
      </header>

      <IntervalIdentifyCard
        key={`${group.id}-${item.id}-${round}`}
        params={built}
        onContinue={() => setRound((r) => r + 1)}
      />

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setRound((r) => r + 1)}>
          New round
        </Button>
        <Button asChild variant="rust">
          <Link href="/intervals">Done</Link>
        </Button>
      </div>
    </main>
  );
}
