"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TrackProgress } from "@/lib/domain/types";
import { getTrackProgress } from "@/lib/db/index";
import { manuallyBypassLevel } from "@/lib/db/trackProgressOps";
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
  const [bypassingId, setBypassingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ids = ["A", "B", "C", "D", "E", "F"] as const;
    const next: ProgressByTrack = {};
    for (const id of ids) {
      next[id] = (await getTrackProgress(id)) as ProgressRow | undefined;
    }
    setByTrack(next);
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!cancelled) await load();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[TracksWithProgress] load failed", err);
        if (!cancelled) setReady(true);
      }
    };
    void run();
    const onUpdate = () => void load();
    window.addEventListener("tonic-track-progress-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("tonic-track-progress-updated", onUpdate);
    };
  }, [load]);

  const onBypass = async (levelId: string, levelLabel: string) => {
    const ok = window.confirm(
      `Mark ${levelLabel} as complete without meeting the usual session/accuracy requirements?\n\nLater levels that depend on it will unlock. This cannot be undone from the app (use Settings → Import only if you exported a backup).`,
    );
    if (!ok) return;
    setBypassingId(levelId);
    try {
      await manuallyBypassLevel(levelId);
      await load();
      window.dispatchEvent(new CustomEvent("tonic-track-progress-updated"));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[TracksWithProgress] bypass failed", err);
      window.alert(
        err instanceof Error ? err.message : "Could not bypass this level.",
      );
    } finally {
      setBypassingId(null);
    }
  };

  if (!ready) {
    return <p className="text-sm text-ink-mute">Loading track progress…</p>;
  }

  return (
    <ul className="space-y-4">
      {TRACKS.map((track) => {
        const entered = isTrackEntered(track.id, byTrack);
        const prog = byTrack[track.id] as TrackProgress | undefined;
        // When a track is locked, surface the actual blocking prerequisite
        // (the first level whose own prereqs aren't all met) instead of a
        // hard-coded "Locked until A·5" message.
        const firstLevel = track.levels[0];
        const blocker = !entered && firstLevel
          ? firstBlockingPrerequisite(firstLevel.id, byTrack)
          : null;
        const blockerLabel = blocker
          ? `${blocker.replace("-", "·")} complete`
          : "earlier level complete";
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
                      Locked until {blockerLabel}
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
                    const levelLabel = `${track.id}·${l.level} · ${l.name}`;
                    return (
                      <li key={l.id} className="pl-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex min-w-0 items-start gap-2">
                            <span
                              className="mt-0.5 font-mono text-xs text-ink-mute"
                              aria-hidden
                            >
                              {statusGlyph(st)}
                            </span>
                            <span className="min-w-0">
                              <span className="font-medium text-ink">
                                {levelLabel}
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
                          {st.kind !== "done" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0 text-[10px] uppercase tracking-wider"
                              disabled={bypassingId != null}
                              onClick={() => void onBypass(l.id, levelLabel)}
                            >
                              {bypassingId === l.id ? "…" : "Bypass"}
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  ✓ complete · ● current · ○ open · 🔒 blocked. Use Bypass to
                  mark a level complete without drilling it.
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
