"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTrackProgress } from "@/lib/db/index";
import { getLevel } from "@/lib/curriculum/levels";
import { NOTE_FINDING_ENTRIES } from "@/lib/curriculum/noteFindingLibrary";

export default function NoteFindingLibraryPage() {
  const [completed, setCompleted] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const b = await getTrackProgress("B");
      if (cancelled) return;
      setCompleted(new Set(b?.completedNodeIds ?? []));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Note-Finding Library
        </p>
        <h1 className="font-display text-3xl text-ink">
          Drill note finding — no progression, just practice
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Continuous prompts. Wrong notes are ignored — keep playing until you
          hit the right note. Each entry unlocks after you complete the source
          Track B level.
        </p>
      </header>

      <div className="space-y-3">
        {NOTE_FINDING_ENTRIES.map((entry) => {
          const lvl = getLevel(entry.unlockedBy);
          const unlocked = completed?.has(entry.unlockedBy) ?? false;

          if (!unlocked) {
            return (
              <Card key={entry.id} className="opacity-60">
                <CardHeader>
                  <CardTitle className="text-ink-soft">{entry.name}</CardTitle>
                  <CardDescription>
                    Unlocks after Track B · Level {lvl?.level ?? "?"}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          }

          return (
            <Card key={entry.id}>
              <Link href={`/notes/${entry.id}`} className="block">
                <CardHeader>
                  <CardTitle>{entry.name}</CardTitle>
                  <CardDescription>{entry.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs uppercase tracking-widest text-rust">
                    Open drill →
                  </span>
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
