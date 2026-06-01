import type {
  LevelResult,
  Session,
  SessionCard,
  TrackId,
  TrackProgress,
} from "@/lib/domain/types";
import { getTrackProgress, putTrackProgress } from "@/lib/db/index";
import {
  appendResults,
  levelMeetsCompletion,
} from "@/lib/curriculum/completion";
import {
  currentLevelIdForTrack,
  unlockedLevelIdsForTrack,
  type ProgressByTrack,
} from "@/lib/curriculum/prerequisites";
import { getLevel, getLevelsForTrack } from "@/lib/curriculum/levels";

const TRACK_IDS: TrackId[] = ["A", "B", "C", "D", "E", "F"];

/** Outcome of a session apply: which levels just completed (for level-up screen). */
export type SessionApplyOutcome = {
  newlyCompleted: Array<{
    trackId: TrackId;
    levelId: string;
    levelName: string;
    nextLevelId: string | null;
    nextLevelName: string | null;
  }>;
};

function gradedToBool(card: SessionCard): boolean | null {
  if (card.grading === "correct") return true;
  if (card.grading === "correct-with-help") return true;
  if (card.grading === "incorrect") return false;
  return null;
}

function nextLevelInTrack(
  trackId: TrackId,
  currentLevelId: string,
): { id: string; name: string } | null {
  const levels = getLevelsForTrack(trackId);
  const i = levels.findIndex((l) => l.id === currentLevelId);
  if (i === -1) return null;
  const next = levels[i + 1];
  if (!next) return null;
  return { id: next.id, name: next.name };
}

async function loadAllProgress(): Promise<ProgressByTrack> {
  const ids: TrackId[] = ["A", "B", "C", "D", "E", "F"];
  const rows = await Promise.all(ids.map((id) => getTrackProgress(id)));
  const out: ProgressByTrack = {};
  ids.forEach((id, i) => {
    out[id] = rows[i];
  });
  return out;
}

/**
 * Mark a level complete without meeting session/accuracy gates — for manual
 * skip from the Tracks page. Advances that track's current level when needed.
 */
export async function manuallyBypassLevel(levelId: string): Promise<boolean> {
  const lvl = getLevel(levelId);
  if (!lvl) return false;

  const prog = await getTrackProgress(lvl.trackId);
  if (!prog) return false;

  if (prog.completedNodeIds.includes(levelId)) {
    return true;
  }

  const updated: TrackProgress = {
    ...prog,
    completedNodeIds: [...prog.completedNodeIds, levelId],
    seenExplainerLevelIds: [...prog.seenExplainerLevelIds],
  };

  if (
    lvl.type === "F" &&
    !updated.seenExplainerLevelIds.includes(levelId)
  ) {
    updated.seenExplainerLevelIds.push(levelId);
  }

  await putTrackProgress(updated);

  const byTrack = await loadAllProgress();
  const fresh = byTrack[lvl.trackId];
  if (!fresh) return true;

  const nextCurrent = currentLevelIdForTrack(lvl.trackId, byTrack);
  if (nextCurrent) {
    const nextLvl = getLevel(nextCurrent);
    await putTrackProgress({
      ...fresh,
      currentNodeId: nextCurrent,
      currentLevel: nextLvl?.level ?? fresh.currentLevel,
    });
  }

  return true;
}

/**
 * After a completed session: append per-level results, increment session counts,
 * mark explainer-seen, and complete levels whose criteria are now met.
 *
 * Returns the list of newly completed levels for the level-up screen.
 */
export async function applySessionToTrackProgress(
  session: Session,
): Promise<SessionApplyOutcome> {
  if (!session.completedAt) return { newlyCompleted: [] };

  const ts = session.completedAt;

  // Group cards by track and by level for efficient updates.
  const resultsByTrack = new Map<TrackId, LevelResult[]>();
  const levelsAppearedByTrack = new Map<TrackId, Set<string>>();
  const explainerCompletedByTrack = new Map<TrackId, Set<string>>();

  for (const card of session.cards) {
    // Review and warmup-slot cards re-drill old material — they must not
    // touch level session counts, accuracy, or "appeared" stats for the
    // current track progression. The drone-listen warmup, due-review
    // warmups, and the new maintenance-from-completed-levels samples all
    // land in the "warmup" slot.
    if (card.slot === "review") continue;
    if (card.slot === "warmup") continue;

    const lvl = getLevel(card.nodeId);
    if (!lvl) continue;
    if (lvl.trackId !== card.trackId) continue; // sanity

    // Skipped cards are an explicit "I'm not attempting this" signal — they
    // do not count toward the level's session occurrence (and never toward
    // accuracy). Pending cards (incomplete sessions) likewise don't count.
    const appearedForCounting =
      card.grading !== "skipped" && card.grading !== "pending";
    if (appearedForCounting) {
      const appeared =
        levelsAppearedByTrack.get(lvl.trackId) ?? new Set<string>();
      appeared.add(lvl.id);
      levelsAppearedByTrack.set(lvl.trackId, appeared);
    }

    if (
      card.cardTemplateId === "concept-explainer" &&
      lvl.type === "F" &&
      card.grading !== "skipped" &&
      card.grading !== "pending"
    ) {
      const set =
        explainerCompletedByTrack.get(lvl.trackId) ?? new Set<string>();
      set.add(lvl.id);
      explainerCompletedByTrack.set(lvl.trackId, set);
    }

    const ok = gradedToBool(card);
    if (ok === null) continue;
    if (
      card.cardTemplateId === "concept-explainer" ||
      card.cardTemplateId === "drone-listen-warmup" ||
      card.cardTemplateId === "freeplay-afterglow"
    ) {
      // Non-graded slot types do NOT count toward accuracy.
      continue;
    }
    const arr = resultsByTrack.get(lvl.trackId) ?? [];
    const usedHint = card.grading === "correct-with-help";
    arr.push({
      levelId: lvl.id,
      correct: ok,
      ts,
      ...(usedHint ? { usedHint: true } : {}),
    });
    resultsByTrack.set(lvl.trackId, arr);
  }

  // Phase 1: write per-track updates (results, session counts, explainer-seen).
  for (const trackId of TRACK_IDS) {
    const prog = await getTrackProgress(trackId);
    if (!prog) continue;

    const next: TrackProgress = {
      trackId: prog.trackId,
      currentNodeId: prog.currentNodeId,
      currentLevel: prog.currentLevel,
      unlockedNodeIds: [...prog.unlockedNodeIds],
      completedNodeIds: [...prog.completedNodeIds],
      seenExplainerLevelIds: [...prog.seenExplainerLevelIds],
      levelSessionCounts: { ...prog.levelSessionCounts },
      recentResults: [...prog.recentResults],
    };

    const appeared = levelsAppearedByTrack.get(trackId);
    if (appeared) {
      appeared.forEach((lvlId) => {
        next.levelSessionCounts[lvlId] =
          (next.levelSessionCounts[lvlId] ?? 0) + 1;
      });
    }

    const seen = explainerCompletedByTrack.get(trackId);
    if (seen) {
      seen.forEach((lvlId) => {
        if (!next.seenExplainerLevelIds.includes(lvlId)) {
          next.seenExplainerLevelIds.push(lvlId);
        }
      });
    }

    const newResults = resultsByTrack.get(trackId);
    if (newResults && newResults.length > 0) {
      next.recentResults = appendResults(next.recentResults, newResults);
    }

    await putTrackProgress(next);
  }

  // Phase 2: with updated counts/results in place, evaluate completion.
  // Re-load fresh progress so cross-track prereqs see latest state.
  let byTrack = await loadAllProgress();
  const newlyCompleted: SessionApplyOutcome["newlyCompleted"] = [];

  // Iterate so cascading completion updates currentLevel/currentNode (e.g. A-1 → A-2).
  // We deliberately recompute `cur` via `currentLevelIdForTrack` rather than
  // trusting `prog.currentNodeId` — older versions of this app stored
  // bespoke node IDs (e.g. "a-hear-tonic") that aren't real curriculum
  // levels. If we trusted the stored value we'd loop forever trying to
  // "complete" a phantom level whose criteria can never be met. Using the
  // prereq engine guarantees `cur` is always a valid, unlocked, not-yet-
  // completed level — exactly what should be evaluated next.
  for (let pass = 0; pass < 10; pass++) {
    let advanced = false;
    for (const trackId of TRACK_IDS) {
      const prog = byTrack[trackId];
      if (!prog) continue;
      const cur = currentLevelIdForTrack(trackId, byTrack);
      if (!cur) continue;
      if (prog.completedNodeIds.includes(cur)) continue;

      if (!levelMeetsCompletion(prog, cur)) continue;

      const updated: TrackProgress = {
        ...prog,
        completedNodeIds: prog.completedNodeIds.includes(cur)
          ? prog.completedNodeIds
          : [...prog.completedNodeIds, cur],
      };

      // Pick the next current level via prereq engine (handles cross-track gates).
      const nextByTrack: ProgressByTrack = { ...byTrack, [trackId]: updated };
      const nextCurrent = currentLevelIdForTrack(trackId, nextByTrack) ?? cur;
      const nextLvl = getLevel(nextCurrent);
      updated.currentNodeId = nextCurrent;
      updated.currentLevel = nextLvl?.level ?? updated.currentLevel;
      nextByTrack[trackId] = updated;
      for (const tid of TRACK_IDS) {
        const row = nextByTrack[tid];
        if (!row) continue;
        nextByTrack[tid] = {
          ...row,
          unlockedNodeIds: unlockedLevelIdsForTrack(tid, nextByTrack),
        };
      }
      for (const tid of TRACK_IDS) {
        const row = nextByTrack[tid];
        if (row) await putTrackProgress(row);
      }

      const justCompleted = getLevel(cur);
      const link = nextLevelInTrack(trackId, cur);
      newlyCompleted.push({
        trackId,
        levelId: cur,
        levelName: justCompleted?.name ?? cur,
        nextLevelId: link?.id ?? null,
        nextLevelName: link?.name ?? null,
      });

      advanced = true;
      byTrack = await loadAllProgress();
    }
    if (!advanced) break;
  }

  return { newlyCompleted };
}
