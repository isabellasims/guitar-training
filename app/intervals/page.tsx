"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INTERVAL_DRILL_GROUPS } from "@/lib/curriculum/intervalLibrary";

export default function IntervalLibraryPage() {
  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Interval library
        </p>
        <h1 className="font-display text-3xl text-ink">
          Identify intervals by ear
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          The app plays two notes — you pick the interval. Every drill draws
          from a focused pool so you can train the pairs that fool you most.
          Open access, no progression.
        </p>
      </header>

      <div className="space-y-8">
        {INTERVAL_DRILL_GROUPS.map((group) => (
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
                    href={`/intervals/${group.id}/${item.id}`}
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
