"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CHORD_FUNCTION_GROUPS } from "@/lib/curriculum/chordFunctionLibrary";

export default function ChordFunctionLibraryPage() {
  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Chord function library
        </p>
        <h1 className="font-display text-3xl text-ink">
          Identify chord functions by ear
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          A short diatonic progression plays — you pick which function (I, IV,
          V, vi…) was at the highlighted position. Pick a key on the drill
          page. Open access, no progression.
        </p>
      </header>

      <div className="space-y-8">
        {CHORD_FUNCTION_GROUPS.map((group) => (
          <section key={group.id} className="space-y-3">
            <div>
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-rust">
                {group.name}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{group.description}</p>
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <Card key={item.id}>
                  <Link
                    href={`/chord-functions/${group.id}/${item.id}`}
                    className="block"
                  >
                    <CardHeader>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
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
        ))}
      </div>
    </main>
  );
}
