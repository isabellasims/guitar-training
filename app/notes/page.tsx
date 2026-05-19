"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecommendUnlockDialog } from "@/components/library/RecommendUnlockDialog";
import { getTrackProgress } from "@/lib/db/index";
import { getLevel } from "@/lib/curriculum/levels";
import { NOTE_FINDING_ENTRIES } from "@/lib/curriculum/noteFindingLibrary";

export default function NoteFindingLibraryPage() {
  const router = useRouter();
  const [seen, setSeen] = useState<Set<string> | null>(null);
  const [pending, setPending] = useState<{
    href: string;
    title: string;
    recommendation: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const b = await getTrackProgress("B");
      if (cancelled) return;
      // Drillable as soon as the level has been encountered in a session.
      const fromSessions = Object.entries(b?.levelSessionCounts ?? {})
        .filter(([, n]) => n > 0)
        .map(([id]) => id);
      const fromExplainer = b?.seenExplainerLevelIds ?? [];
      const fromCompleted = b?.completedNodeIds ?? [];
      setSeen(new Set([...fromSessions, ...fromExplainer, ...fromCompleted]));
    };
    void load();
    const onUpdate = () => void load();
    window.addEventListener("tonic-track-progress-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("tonic-track-progress-updated", onUpdate);
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
          hit the right note. Locked entries are still drillable — we just
          recommend hitting them in curriculum order.
        </p>
      </header>

      <div className="space-y-3">
        {NOTE_FINDING_ENTRIES.map((entry) => {
          const lvl = getLevel(entry.unlockedBy);
          const unlocked = seen?.has(entry.unlockedBy) ?? false;
          const href = `/notes/${entry.id}`;

          if (!unlocked) {
            return (
              <Card
                key={entry.id}
                className="cursor-pointer transition-colors hover:border-rust"
                onClick={() =>
                  setPending({
                    href,
                    title: entry.name,
                    recommendation: `We recommend finishing Track B · Level ${
                      lvl?.level ?? "?"
                    }${lvl?.name ? ` (${lvl.name})` : ""} first.`,
                  })
                }
              >
                <CardHeader>
                  <CardTitle className="text-ink">{entry.name}</CardTitle>
                  <CardDescription>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                      Recommended after Track B · Level {lvl?.level ?? "?"}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs uppercase tracking-widest text-rust">
                    Open drill →
                  </span>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={entry.id}>
              <Link href={href} className="block">
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

      <RecommendUnlockDialog
        open={pending != null}
        title={pending?.title ?? ""}
        recommendation={pending?.recommendation ?? ""}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const href = pending?.href;
          setPending(null);
          if (href) router.push(href);
        }}
      />
    </main>
  );
}
