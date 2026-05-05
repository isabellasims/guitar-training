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
import {
  SHAPES,
  type ShapeCategory,
  type ShapeDefinition,
} from "@/lib/curriculum/shapeLibrary";
import { getLevel } from "@/lib/curriculum/levels";
import { cn } from "@/lib/utils";

type LockedShape = ShapeDefinition & {
  unlocked: boolean;
  unlockHint: string;
};

const CATEGORY_ORDER: ShapeCategory[] = [
  "Open scales",
  "Movable scales",
  "Pentatonic boxes",
  "CAGED chord tones",
];

export default function ScaleLibraryPage() {
  const [completed, setCompleted] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const c = await getTrackProgress("C");
      if (cancelled) return;
      setCompleted(new Set(c?.completedNodeIds ?? []));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shapes: LockedShape[] = SHAPES.map((s) => {
    const lvl = getLevel(s.unlockedBy);
    const unlocked = completed?.has(s.unlockedBy) ?? false;
    return {
      ...s,
      unlocked,
      unlockHint: lvl
        ? `Unlocks after Track C · Level ${lvl.level}`
        : `Unlocks after ${s.unlockedBy}`,
    };
  });

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: shapes.filter((s) => s.category === cat),
  }));

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Scale Library
        </p>
        <h1 className="font-display text-3xl text-ink">
          Practice scales you&apos;ve already learned
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Drill any shape unlocked through Track C. Same continuous-listening
          mode as the curriculum — wrong notes are ignored, no progress
          tracking. Movable shapes can be transposed to any key.
        </p>
      </header>

      <div className="space-y-8">
        {grouped.map(({ category, items }) =>
          items.length === 0 ? null : (
            <section key={category} className="space-y-3">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-rust">
                {category}
              </h2>
              <div className="space-y-3">
                {items.map((shape) => (
                  <ShapeRow key={shape.id} shape={shape} />
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </main>
  );
}

function ShapeRow({ shape }: { shape: LockedShape }) {
  if (!shape.unlocked) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-ink-soft">{shape.name}</CardTitle>
          <CardDescription>{shape.unlockHint}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <Link href={`/scales/${shape.id}`} className="block">
        <CardHeader>
          <CardTitle className={cn(shape.transposable && "text-rust")}>
            {shape.name}
          </CardTitle>
          <CardDescription>
            {shape.description} · default {shape.defaultKeyLabel}
            {shape.transposable ? " · tonic picker" : " · fixed key"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-xs uppercase tracking-widest text-rust">
            Open drill →
          </span>
        </CardContent>
      </Link>
    </Card>
  );
}
