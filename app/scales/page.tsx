"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SHAPES, type ShapeCategory } from "@/lib/curriculum/shapeLibrary";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: ShapeCategory[] = [
  "Open scales",
  "Movable scales",
  "Pentatonic boxes",
  "CAGED chord tones",
];

export default function ScaleLibraryPage() {
  // Library access is open: every shape is browsable and drillable from the
  // start. The curriculum still introduces shapes in order; this is just a
  // reference / drill surface that doesn't gate on progression.
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: SHAPES.filter((s) => s.category === cat && !s.curriculumOnly),
  }));

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Scale Library
        </p>
        <h1 className="font-display text-3xl text-ink">
          Every shape, available to drill
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Drill any shape — open or movable. Same continuous-listening mode as
          the curriculum, no progress tracking. Movable shapes can be
          transposed to any key.
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
                  <Card key={shape.id}>
                    <Link href={`/scales/${shape.id}`} className="block">
                      <CardHeader>
                        <CardTitle
                          className={cn(shape.transposable && "text-rust")}
                        >
                          {shape.name}
                        </CardTitle>
                        <CardDescription>
                          {shape.description} · default {shape.defaultKeyLabel}
                          {shape.transposable
                            ? " · tonic picker"
                            : " · fixed key"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="text-xs uppercase tracking-widest text-rust">
                          Open drill →
                        </span>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </main>
  );
}
