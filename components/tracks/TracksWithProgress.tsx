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
import type { TrackId } from "@/lib/domain/types";
import { getTrackProgress } from "@/lib/db/index";
import { TRACKS } from "@/lib/tracks/tracks";

type ProgressRow = NonNullable<Awaited<ReturnType<typeof getTrackProgress>>>;

function nodeStatus(
  nodeId: string,
  p: ProgressRow | undefined,
): "done" | "current" | "open" {
  if (!p) return "open";
  if (p.completedNodeIds.includes(nodeId)) return "done";
  if (p.currentNodeId === nodeId) return "current";
  return "open";
}

export function TracksWithProgress() {
  const [byTrack, setByTrack] = useState<
    Partial<Record<TrackId, ProgressRow | undefined>>
  >({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ids = ["A", "B", "C", "D"] as const;
      const next: Partial<Record<TrackId, ProgressRow | undefined>> = {};
      for (const id of ids) {
        next[id] = await getTrackProgress(id);
      }
      if (!cancelled) {
        setByTrack(next);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <p className="text-sm text-ink-mute">Loading track progress…</p>
    );
  }

  return (
    <ul className="space-y-4">
      {TRACKS.map((track) => {
        const p = byTrack[track.id];
        return (
          <li key={track.id}>
            <Card>
              <CardHeader>
                <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
                  Track {track.id}
                </p>
                <CardTitle>{track.name}</CardTitle>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-soft">
                  {track.nodes.map((n) => {
                    const st = nodeStatus(n.id, p);
                    return (
                      <li key={n.id} className="pl-1">
                        <span className="inline-flex items-start gap-2">
                          <span
                            className="mt-0.5 font-mono text-xs text-ink-mute"
                            aria-hidden
                          >
                            {st === "done"
                              ? "✓"
                              : st === "current"
                                ? "●"
                                : "○"}
                          </span>
                          <span>
                            <span className="font-medium text-ink">
                              {n.title}
                            </span>
                            <span className="mt-0.5 block text-ink-mute">
                              {n.summary}
                            </span>
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  ✓ done · ● current focus · ○ open — completion wiring comes in a
                  later pass.
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  <Link href="/guitar-practice-plan.html" className="text-rust">
                    Manual →
                  </Link>
                </p>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
