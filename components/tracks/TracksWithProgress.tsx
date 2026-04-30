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
import type { TrackProgress } from "@/lib/domain/types";
import { getTrackProgress } from "@/lib/db/index";
import { TRACKS } from "@/lib/tracks/tracks";
import {
  firstBlockingPrerequisite,
  isLevelUnlocked,
  isTrackEntered,
  type ProgressByTrack,
} from "@/lib/curriculum/prerequisites";
import { getLevel } from "@/lib/curriculum/levels";
import { summarizeLevelProgress } from "@/lib/curriculum/completion";

type ProgressRow = NonNullable<Awaited<ReturnType<typeof getTrackProgress>>>;

type LevelStatus =
  | { kind: "done" }
  | { kind: "current" }
  | { kind: "blocked"; blockedBy: string }
  | { kind: "open" };

function levelStatus(
  levelId: string,
  byTrack: ProgressByTrack,
): LevelStatus {
  const lvl = getLevel(levelId);
  if (!lvl) return { kind: "open" };
  const prog = byTrack[lvl.trackId];
  if (prog?.completedNodeIds.includes(levelId)) return { kind: "done" };
  if (prog?.currentNodeId === levelId && isLevelUnlocked(levelId, byTrack)) {
    return { kind: "current" };
  }
  if (!isLevelUnlocked(levelId, byTrack)) {
    const blocker = firstBlockingPrerequisite(levelId, byTrack);
    return { kind: "blocked", blockedBy: blocker ?? "earlier level" };
  }
  return { kind: "open" };
}

function statusGlyph(s: LevelStatus): string {
  if (s.kind === "done") return "✓";
  if (s.kind === "current") return "●";
  if (s.kind === "blocked") return "🔒";
  return "○";
}

export function TracksWithProgress() {
  const [byTrack, setByTrack] = useState<ProgressByTrack>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ids = ["A", "B", "C", "D", "E"] as const;
      const next: ProgressByTrack = {};
      for (const id of ids) {
        next[id] = (await getTrackProgress(id)) as ProgressRow | undefined;
      }
      if (!cancelled) {
        setByTrack(next);
        setReady(true);
      }
    };
    void load();
    const onUpdate = () => void load();
    window.addEventListener("tonic-track-progress-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("tonic-track-progress-updated", onUpdate);
    };
  }, []);

  if (!ready) {
    return <p className="text-sm text-ink-mute">Loading track progress…</p>;
  }

  return (
    <ul className="space-y-4">
      {TRACKS.map((track) => {
        const entered = isTrackEntered(track.id, byTrack);
        const prog = byTrack[track.id] as TrackProgress | undefined;
        return (
          <li key={track.id}>
            <Card>
              <CardHeader>
                <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
                  Track {track.id}
                </p>
                <CardTitle>{track.name}</CardTitle>
                <CardDescription>
                  {track.description}
                  {!entered ? (
                    <span className="ml-2 rounded border border-rule px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-mute">
                      Locked until A·5 complete
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-none space-y-2 text-sm text-ink-soft">
                  {track.levels.map((l) => {
                    const st = levelStatus(l.id, byTrack);
                    const summary = prog
                      ? summarizeLevelProgress(prog, l.id)
                      : null;
                    return (
                      <li key={l.id} className="pl-1">
                        <span className="inline-flex items-start gap-2">
                          <span
                            className="mt-0.5 font-mono text-xs text-ink-mute"
                            aria-hidden
                          >
                            {statusGlyph(st)}
                          </span>
                          <span>
                            <span className="font-medium text-ink">
                              {track.id}·{l.level} · {l.name}
                            </span>
                            <span className="ml-2 rounded border border-rule px-1 py-px text-[9px] uppercase tracking-wider text-ink-mute">
                              {l.type === "F" ? "foundation" : "practice"}
                            </span>
                            {st.kind === "blocked" ? (
                              <span className="mt-0.5 block text-ink-mute">
                                Unlocks after {st.blockedBy}
                              </span>
                            ) : null}
                            {summary && st.kind !== "blocked" ? (
                              <span className="mt-0.5 block font-mono text-[10px] text-ink-mute">
                                {summary.sessionsSeen} sessions ·{" "}
                                {summary.recentAccuracy === null
                                  ? "no graded cards yet"
                                  : `${Math.round(summary.recentAccuracy * 100)}% recent (${summary.recentCorrect}/${summary.recentWindow})`}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  ✓ complete · ● current · ○ open · 🔒 blocked.
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
