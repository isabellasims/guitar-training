"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";

import { NoteFindingPlayCard } from "@/components/cards/NoteFindingPlayCard";
import { Button } from "@/components/ui/button";
import { NOTE_FINDING_BY_ID } from "@/lib/curriculum/noteFindingLibrary";

export default function NoteFindingDrillPage() {
  const params = useParams<{ cardId: string }>();
  const [round, setRound] = useState(0);
  const entry = NOTE_FINDING_BY_ID[params.cardId];
  if (!entry) return notFound();

  return (
    <main className="px-4 py-8">
      <header className="mb-6">
        <Button asChild variant="ghost" className="px-0 text-rust">
          <Link href="/notes">← Note-Finding Library</Link>
        </Button>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Note-Finding drill
        </p>
        <h1 className="font-display text-3xl text-ink">{entry.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{entry.description}</p>
      </header>

      <NoteFindingPlayCard
        key={`${entry.id}-${round}`}
        params={entry.buildParams()}
        onContinue={() => setRound((r) => r + 1)}
      />

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setRound((r) => r + 1)}>
          New round
        </Button>
        <Button asChild variant="rust">
          <Link href="/notes">Done</Link>
        </Button>
      </div>
    </main>
  );
}
