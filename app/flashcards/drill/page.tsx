"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCustomCards } from "@/lib/db/index";
import type { CustomCardRow } from "@/lib/db/schema";

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export default function FlashcardsDrillPage() {
  const [cards, setCards] = useState<CustomCardRow[] | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    void getCustomCards().then((c) => {
      setCards(c);
      setOrder(shuffle(c).map((x) => x.id));
    });
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, CustomCardRow>();
    (cards ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [cards]);

  if (cards === null) {
    return (
      <main className="px-4 py-8">
        <p className="text-sm text-ink-mute">Loading…</p>
      </main>
    );
  }

  if (order.length === 0) {
    return (
      <main className="px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>No flashcards yet</CardTitle>
            <CardDescription>
              Author a flashcard first, then come back to drill.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="rust">
              <Link href="/flashcards">Back to flashcards</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (idx >= order.length) {
    return (
      <main className="px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Done</CardTitle>
            <CardDescription>
              Reviewed {order.length} card{order.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="rust"
              onClick={() => {
                setOrder(shuffle(cards).map((x) => x.id));
                setIdx(0);
                setRevealed(false);
              }}
            >
              Drill again
            </Button>
            <Button asChild variant="outline">
              <Link href="/flashcards">Back</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const cur = byId.get(order[idx]!);
  if (!cur) {
    // The card was deleted while we were drilling. Skip it.
    setIdx((i) => i + 1);
    return null;
  }

  return (
    <main className="px-4 py-8">
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
          Flashcards · drill
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          {idx + 1} of {order.length}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{cur.title}</CardTitle>
          {cur.tags && cur.tags.length > 0 ? (
            <CardDescription className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
              {cur.tags.join(" · ")}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-base text-ink">{cur.front}</p>
          {revealed ? (
            <p className="whitespace-pre-wrap rounded-md border border-rule bg-paper-soft p-3 text-sm text-ink-soft">
              {cur.back}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!revealed ? (
              <Button type="button" variant="rust" onClick={() => setRevealed(true)}>
                Show answer
              </Button>
            ) : (
              <Button
                type="button"
                variant="rust"
                onClick={() => {
                  setIdx((i) => i + 1);
                  setRevealed(false);
                }}
              >
                Next
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIdx((i) => i + 1);
                setRevealed(false);
              }}
            >
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
