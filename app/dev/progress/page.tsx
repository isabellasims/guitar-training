"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db, getTrackProgress, putTrackProgress } from "@/lib/db/index";
import {
  COMPLETION_CRITERIA,
  summarizeLevelProgress,
} from "@/lib/curriculum/completion";
import {
  EXPLAINER_ONLY_LEVELS,
} from "@/lib/curriculum/cardsForLevel";
import {
  currentLevelIdForTrack,
  firstBlockingPrerequisite,
  isLevelUnlocked,
  isTrackEntered,
  type ProgressByTrack,
} from "@/lib/curriculum/prerequisites";
import {
  getLevel,
  getLevelsForTrack,
  type Level,
} from "@/lib/curriculum/levels";
import { applySessionToTrackProgress } from "@/lib/db/trackProgressOps";
import type { Session, TrackId, TrackProgress } from "@/lib/domain/types";

const TRACKS: TrackId[] = ["A", "B", "C", "D", "E", "F"];
const TRACK_NAMES: Record<TrackId, string> = {
  A: "Track A · Scale Degrees",
  B: "Track B · Note Finding",
  C: "Track C · Fretboard & CAGED",
  D: "Track D · Hearing Chord Changes",
  E: "Track E · Intervals",
  F: "Track F · Improvisation",
};

type Diagnosis =
  | { kind: "officially-complete" }
  | { kind: "criteria-met-not-marked" }
  | { kind: "blocked"; blockedBy: string }
  | { kind: "needs-explainer" }
  | { kind: "needs-sessions"; have: number; need: number }
  | { kind: "needs-graded"; have: number; need: number }
  | { kind: "low-accuracy"; pct: number; need: number; have: string };

function diagnose(
  level: Level,
  prog: TrackProgress | undefined,
  byTrack: ProgressByTrack,
): Diagnosis {
  if (prog?.completedNodeIds.includes(level.id)) {
    return { kind: "officially-complete" };
  }
  if (!isLevelUnlocked(level.id, byTrack)) {
    const b = firstBlockingPrerequisite(level.id, byTrack);
    return { kind: "blocked", blockedBy: b ?? "earlier level" };
  }
  if (!prog) {
    return { kind: "needs-sessions", have: 0, need: COMPLETION_CRITERIA.minSessions };
  }
  const sessions = prog.levelSessionCounts[level.id] ?? 0;
  if (sessions < COMPLETION_CRITERIA.minSessions) {
    return {
      kind: "needs-sessions",
      have: sessions,
      need: COMPLETION_CRITERIA.minSessions,
    };
  }
  if (EXPLAINER_ONLY_LEVELS.has(level.id)) {
    if (!prog.seenExplainerLevelIds.includes(level.id)) {
      return { kind: "needs-explainer" };
    }
    return { kind: "criteria-met-not-marked" };
  }
  const recent = prog.recentResults
    .filter((r) => r.levelId === level.id)
    .slice(-COMPLETION_CRITERIA.accuracyWindow);
  if (recent.length < COMPLETION_CRITERIA.minGraded) {
    return {
      kind: "needs-graded",
      have: recent.length,
      need: COMPLETION_CRITERIA.minGraded,
    };
  }
  // Match the weighted-accuracy logic in `levelMeetsCompletion`:
  // hint-assisted correct answers count as 50% rather than 100%.
  const weighted = recent.reduce(
    (sum, r) =>
      sum + (r.correct ? (r.usedHint ? COMPLETION_CRITERIA.hintCreditFactor : 1) : 0),
    0,
  );
  const pct = weighted / recent.length;
  // For the "have" string, count clean-correct only (matches what the
  // user sees in the recent-results detail view). The percentage above
  // already factors in hint-assisted answers at 50%.
  const cleanCorrect = recent.filter((r) => r.correct && !r.usedHint).length;
  if (pct < COMPLETION_CRITERIA.minAccuracy) {
    return {
      kind: "low-accuracy",
      pct,
      need: COMPLETION_CRITERIA.minAccuracy,
      have: `${cleanCorrect}/${recent.length}`,
    };
  }
  return { kind: "criteria-met-not-marked" };
}

function diagnosisLabel(d: Diagnosis): string {
  switch (d.kind) {
    case "officially-complete":
      return "complete";
    case "criteria-met-not-marked":
      return "criteria met — finish a session (or click 'Re-apply all completed sessions' above) to officially mark complete";
    case "blocked":
      return `blocked by ${d.blockedBy}`;
    case "needs-explainer":
      return "explainer not yet seen — open the level once and acknowledge it";
    case "needs-sessions":
      return `${d.have} / ${d.need} sessions seen`;
    case "needs-graded":
      return `${d.have} / ${d.need} graded results in window — play more cards (no skips)`;
    case "low-accuracy":
      return `accuracy ${(d.pct * 100).toFixed(0)}% (need ≥${(d.need * 100).toFixed(0)}%, ${d.have} recent)`;
  }
}

type SessionsSummary = {
  total: number;
  completed: number;
  recent: Session[];
};

export default function ProgressDiagnosticPage() {
  const [byTrack, setByTrack] = useState<ProgressByTrack>({});
  const [sessions, setSessions] = useState<SessionsSummary>({
    total: 0,
    completed: 0,
    recent: [],
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const reload = async () => {
    try {
      const next: ProgressByTrack = {};
      for (const t of TRACKS) {
        next[t] = await getTrackProgress(t);
      }
      const allSessions = await db.sessions.toArray();
      const completedSessions = allSessions
        .filter((s) => s.completedAt)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
      setByTrack(next);
      setSessions({
        total: allSessions.length,
        completed: completedSessions.length,
        recent: completedSessions.slice(0, 5),
      });
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setReady(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await reload();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reapplyMostRecent = async () => {
    setActionMsg(null);
    const target = sessions.recent[0];
    if (!target) {
      setActionMsg("No completed sessions to re-apply.");
      return;
    }
    try {
      const result = await applySessionToTrackProgress(target);
      setActionMsg(
        `Re-applied session ${target.id.slice(0, 8)}… ${
          result.newlyCompleted.length > 0
            ? `Newly completed: ${result.newlyCompleted.map((c) => c.levelId).join(", ")}.`
            : "No new levels completed."
        }`,
      );
      await reload();
      try {
        window.dispatchEvent(new Event("tonic-track-progress-updated"));
      } catch {
        /* benign */
      }
    } catch (e) {
      setActionMsg(`Re-apply failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const reapplyAllCompleted = async () => {
    setActionMsg(null);
    if (sessions.completed === 0) {
      setActionMsg("No completed sessions to re-apply.");
      return;
    }
    try {
      const all = await db.sessions.toArray();
      const completed = all
        .filter((s) => s.completedAt)
        .sort((a, b) =>
          (a.completedAt ?? "").localeCompare(b.completedAt ?? ""),
        );
      let newlyCompletedTotal = 0;
      for (const s of completed) {
        const result = await applySessionToTrackProgress(s);
        newlyCompletedTotal += result.newlyCompleted.length;
      }
      setActionMsg(
        `Re-applied ${completed.length} session(s). ${newlyCompletedTotal} level completion(s) newly recorded across the run.`,
      );
      await reload();
      try {
        window.dispatchEvent(new Event("tonic-track-progress-updated"));
      } catch {
        /* benign */
      }
    } catch (e) {
      setActionMsg(`Re-apply failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const a5Done = !!byTrack.A?.completedNodeIds.includes("A-5");
  const dEntered = isTrackEntered("D", byTrack);
  const eEntered = isTrackEntered("E", byTrack);

  const json = useMemo(() => JSON.stringify(byTrack, null, 2), [byTrack]);

  if (!ready) {
    return (
      <main className="px-4 py-8">
        <p className="text-sm text-ink-mute">Loading progress…</p>
      </main>
    );
  }

  return (
    <main className="px-4 py-8">
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Dev
        </p>
        <h1 className="font-display text-3xl text-ink">Progress diagnostic</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Reads your live IndexedDB row-by-row and tells you exactly what is
          gating each level. Includes the raw data so you can copy it back.
        </p>
      </header>

      {error ? (
        <Card className="mb-6 border-rust">
          <CardContent className="py-4 text-sm text-rust">
            Failed to read progress: {error}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Stored sessions</CardTitle>
          <CardDescription>
            Sessions are written to IndexedDB only when the user clicks Done /
            Skip / Mark complete on the LAST card of the run. If these counts
            are 0 even though you played cards, you exited the session before
            finishing the final card and nothing was persisted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 font-mono text-xs">
          <p>
            Total session rows: <strong>{sessions.total}</strong>
          </p>
          <p>
            Completed (have completedAt): <strong>{sessions.completed}</strong>
          </p>
          {sessions.recent.length > 0 ? (
            <div className="space-y-2">
              <p className="text-ink-mute">5 most recent completed sessions:</p>
              <ul className="space-y-2">
                {sessions.recent.map((s) => {
                  const counts = s.cards.reduce<Record<string, number>>(
                    (acc, c) => {
                      acc[c.grading] = (acc[c.grading] ?? 0) + 1;
                      return acc;
                    },
                    {},
                  );
                  const levels = Array.from(
                    new Set(s.cards.map((c) => c.nodeId)),
                  ).join(", ");
                  return (
                    <li
                      key={s.id}
                      className="rounded-md border border-rule px-3 py-2"
                    >
                      <p>
                        {s.completedAt} · {s.cards.length} cards
                      </p>
                      <p className="text-ink-mute">grading: {JSON.stringify(counts)}</p>
                      <p className="text-ink-mute">levels: {levels}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-rust">
              No completed sessions found in IndexedDB.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void reapplyMostRecent()}
              disabled={sessions.completed === 0}
            >
              Re-apply most recent
            </Button>
            <Button
              type="button"
              variant="rust"
              size="sm"
              onClick={() => void reapplyAllCompleted()}
              disabled={sessions.completed === 0}
            >
              Re-apply all completed sessions
            </Button>
          </div>
          {actionMsg ? (
            <p className="rounded border border-rule bg-paper-soft px-3 py-2 text-ink-soft">
              {actionMsg}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Track entry status</CardTitle>
          <CardDescription>
            Tracks A, B, C are always entered. Tracks D and E require A·5
            (&quot;The 3rd&quot;) to be marked complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs">
          <p>
            A·5 complete: <strong>{a5Done ? "yes" : "no"}</strong>
          </p>
          <p>
            Track D entered: <strong>{dEntered ? "yes" : "no"}</strong>
          </p>
          <p>
            Track E entered: <strong>{eEntered ? "yes" : "no"}</strong>
          </p>
          {!a5Done ? (
            <p className="mt-3 text-sm text-ink-soft">
              The chain to unlock D and E is: A·1 → A·2 (also requires C·2) →
              A·3 → A·4 → A·5. Whichever level below shows a blocker is the
              one to focus on.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {TRACKS.map((tid) => {
          const prog = byTrack[tid];
          const levels = getLevelsForTrack(tid);
          const cur = currentLevelIdForTrack(tid, byTrack);
          const curLvl = cur ? getLevel(cur) : null;
          const completedCount = prog?.completedNodeIds.length ?? 0;
          return (
            <Card key={tid}>
              <CardHeader>
                <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
                  {TRACK_NAMES[tid]}
                </p>
                <CardTitle className="text-xl">
                  {completedCount} / {levels.length} levels complete
                </CardTitle>
                <CardDescription>
                  Current level:{" "}
                  {curLvl ? (
                    <strong>
                      {curLvl.id} · {curLvl.name}
                    </strong>
                  ) : (
                    <em>none unlocked</em>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {levels.map((lvl) => {
                    const d = diagnose(lvl, prog, byTrack);
                    const summary = prog
                      ? summarizeLevelProgress(prog, lvl.id)
                      : null;
                    const isComplete = !!prog?.completedNodeIds.includes(
                      lvl.id,
                    );
                    const isCurrent = cur === lvl.id;
                    return (
                      <li
                        key={lvl.id}
                        className={`rounded-md border px-3 py-2 ${
                          isCurrent
                            ? "border-rust bg-paper-soft"
                            : "border-rule"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-ink">
                            {isComplete ? "✓" : isCurrent ? "●" : "○"}{" "}
                            {lvl.id} · {lvl.name}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                            {lvl.type === "F" ? "foundation" : "practice"}
                          </span>
                        </div>
                        <p
                          className={`mt-1 text-xs ${
                            d.kind === "criteria-met-not-marked"
                              ? "text-gold"
                              : "text-ink-soft"
                          }`}
                        >
                          {diagnosisLabel(d)}
                        </p>
                        {summary ? (
                          <p className="mt-1 font-mono text-[10px] text-ink-mute">
                            sessionsSeen={summary.sessionsSeen} · graded
                            {summary.totalGraded} · recent
                            {summary.recentCorrect}/{summary.recentWindow}
                            {summary.recentAccuracy != null
                              ? ` · ${(summary.recentAccuracy * 100).toFixed(0)}%`
                              : ""}
                          </p>
                        ) : null}
                        {lvl.prerequisiteLevelIds.length > 0 ? (
                          <p className="mt-1 font-mono text-[10px] text-ink-mute">
                            prereqs: {lvl.prerequisiteLevelIds.join(", ")}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Export / import progress</CardTitle>
          <CardDescription>
            IndexedDB is partitioned per origin (e.g. localhost:3000 vs
            localhost:3001 are separate stores). If `next dev` ever bumped to
            a different port and your data &quot;disappeared&quot;, visit the old
            port, copy the JSON below, then come back here on the new port and
            paste it into the import box to restore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(json).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? "Copied" : "Copy to clipboard"}
            </Button>
          </div>
          <pre className="max-h-96 overflow-auto rounded-md border border-rule bg-paper-soft p-3 font-mono text-[11px] text-ink-soft">
            {json}
          </pre>
          <ImportProgressBlock onImported={() => void reload()} />
        </CardContent>
      </Card>

      <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
        Completion criteria: minSessions={COMPLETION_CRITERIA.minSessions} ·
        accuracyWindow={COMPLETION_CRITERIA.accuracyWindow} · minGraded=
        {COMPLETION_CRITERIA.minGraded} · minAccuracy=
        {COMPLETION_CRITERIA.minAccuracy * 100}%
      </p>
    </main>
  );
}

function ImportProgressBlock({ onImported }: { onImported: () => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const importJson = async () => {
    setMsg(null);
    if (!text.trim()) {
      setMsg("Paste a progress JSON blob first.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setMsg(`Not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      setMsg("Expected an object keyed by track id (A, B, C, D, E).");
      return;
    }
    setBusy(true);
    try {
      const obj = parsed as Record<string, unknown>;
      const ids: TrackId[] = ["A", "B", "C", "D", "E", "F"];
      let written = 0;
      for (const tid of ids) {
        const row = obj[tid];
        if (!row || typeof row !== "object") continue;
        const r = row as Partial<TrackProgress>;
        if (r.trackId !== tid) continue;
        const merged: TrackProgress = {
          trackId: tid,
          currentNodeId: r.currentNodeId ?? "",
          currentLevel: r.currentLevel ?? 1,
          unlockedNodeIds: r.unlockedNodeIds ?? [],
          completedNodeIds: r.completedNodeIds ?? [],
          seenExplainerLevelIds: r.seenExplainerLevelIds ?? [],
          levelSessionCounts: r.levelSessionCounts ?? {},
          recentResults: r.recentResults ?? [],
        };
        await putTrackProgress(merged);
        written += 1;
      }
      setMsg(
        `Imported ${written} track row(s). The diagnostic above will refresh.`,
      );
      try {
        window.dispatchEvent(new Event("tonic-track-progress-updated"));
      } catch {
        /* benign */
      }
      onImported();
    } catch (e) {
      setMsg(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-rule px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
        Import from another origin
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Paste the JSON dump from above (e.g. captured on localhost:3001).'
        className="h-32 w-full resize-y rounded border border-rule bg-paper-soft px-2 py-1 font-mono text-xs text-ink-soft"
        spellCheck={false}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="rust"
          size="sm"
          onClick={() => void importJson()}
          disabled={busy}
        >
          {busy ? "Importing…" : "Overwrite progress with this JSON"}
        </Button>
        {msg ? <span className="text-xs text-ink-soft">{msg}</span> : null}
      </div>
      <p className="text-xs text-ink-mute">
        This replaces the matching trackProgress rows entirely. Sessions,
        review items, and streak are not transferred — only progress
        (sessions seen, completed levels, recent results, explainer-seen).
      </p>
    </div>
  );
}
