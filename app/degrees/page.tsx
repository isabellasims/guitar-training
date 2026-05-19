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
import { DEGREE_DRILL_GROUPS } from "@/lib/curriculum/degreeDrillLibrary";

export default function DegreeDrillLibraryPage() {
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
      const a = await getTrackProgress("A");
      if (cancelled) return;
      const fromSessions = Object.entries(a?.levelSessionCounts ?? {})
        .filter(([, n]) => n > 0)
        .map(([id]) => id);
      const fromExplainer = a?.seenExplainerLevelIds ?? [];
      const fromCompleted = a?.completedNodeIds ?? [];
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
          Scale degree library
        </p>
        <h1 className="font-display text-3xl text-ink">
          Drill degrees in groups — no progression, just practice
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Each group bundles related prompts (stable triad, diatonic color, minor
          colors). Pick a tonic on the drill page. Locked entries are still
          drillable — we just recommend hitting them in curriculum order.
        </p>
      </header>

      <div className="space-y-8">
        {DEGREE_DRILL_GROUPS.map((group) => (
          <section key={group.id} className="space-y-3">
            <div>
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-rust">
                {group.name}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{group.description}</p>
            </div>
            <div className="space-y-3">
              {group.items.map((item) => {
                const lvl = getLevel(item.unlockedBy);
                const unlocked = seen?.has(item.unlockedBy) ?? false;
                const href = `/degrees/${group.id}/${item.id}`;

                if (!unlocked) {
                  return (
                    <Card
                      key={item.id}
                      className="cursor-pointer transition-colors hover:border-rust"
                      onClick={() =>
                        setPending({
                          href,
                          title: item.name,
                          recommendation: `We recommend finishing Track A · Level ${
                            lvl?.level ?? "?"
                          }${lvl?.name ? ` (${lvl.name})` : ""} first.`,
                        })
                      }
                    >
                      <CardHeader>
                        <CardTitle className="text-ink">{item.name}</CardTitle>
                        <CardDescription>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
                            Recommended after Track A · Level {lvl?.level ?? "?"}
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
                  <Card key={item.id}>
                    <Link href={href} className="block">
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
                );
              })}
            </div>
          </section>
        ))}
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
