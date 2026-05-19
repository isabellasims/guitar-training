import type { LevelResult, TrackProgress } from "@/lib/domain/types";
import { EXPLAINER_ONLY_LEVELS } from "@/lib/curriculum/cardsForLevel";

export const COMPLETION_CRITERIA = {
  /**
   * Minimum *distinct sessions* a level must appear in before it can complete.
   * Computed from distinct `ts` values in the level's recent results; a
   * single marathon session does not satisfy mastery.
   */
  minSessions: 3,
  /** Minimum accuracy across the most recent N graded cards from this level. */
  minAccuracy: 0.9,
  /** Window size for accuracy (looks at the last N graded cards). */
  accuracyWindow: 12,
  /**
   * Minimum number of graded cards required before we'll evaluate accuracy.
   * Mastery threshold: must have actually drilled the level, not just brushed it.
   */
  minGraded: 12,
  /** Hard cap on stored per-level recent results, to keep Dexie rows small. */
  maxRetainedResultsPerLevel: 60,
  /**
   * Accuracy weight applied to a result that was answered correctly *but*
   * only after the user enabled an in-card hint. Lets a user use the hint
   * to get unstuck without artificially inflating their level accuracy
   * past the point where the level should be marked complete.
   */
  hintCreditFactor: 0.5,
} as const;

/**
 * Count distinct sessions a level has been graded in. Cards inside a single
 * session share a `ts` (the session's completedAt), so counting distinct
 * `ts` values gives a per-session count.
 */
function distinctSessions(results: LevelResult[]): number {
  const set = new Set<string>();
  for (const r of results) set.add(r.ts);
  return set.size;
}

/**
 * Map a stored result to its accuracy weight (0..1):
 *   - wrong            → 0
 *   - correct, no hint → 1
 *   - correct + hint   → `hintCreditFactor` (50%)
 */
function resultWeight(r: LevelResult): number {
  if (!r.correct) return 0;
  return r.usedHint ? COMPLETION_CRITERIA.hintCreditFactor : 1;
}

/**
 * Whether the level meets both completion conditions.
 * Returns false if there aren’t yet enough graded cards in the window.
 *
 * Special case: explainer-only levels (e.g. A-1, A-2) have no graded practice
 * cards. They complete once the explainer has been seen at least once and
 * the level has appeared in `minSessions` sessions.
 */
export function levelMeetsCompletion(
  progress: TrackProgress,
  levelId: string,
): boolean {
  const sessions = progress.levelSessionCounts[levelId] ?? 0;
  if (sessions < COMPLETION_CRITERIA.minSessions) return false;

  if (EXPLAINER_ONLY_LEVELS.has(levelId)) {
    return progress.seenExplainerLevelIds.includes(levelId);
  }

  // Mastery, not coverage: the accuracy window must span at least
  // `minSessions` distinct sessions. Marathon sessions don't satisfy.
  const levelResults = progress.recentResults.filter(
    (r) => r.levelId === levelId,
  );
  const recent = levelResults.slice(-COMPLETION_CRITERIA.accuracyWindow);
  if (recent.length < COMPLETION_CRITERIA.minGraded) return false;
  if (distinctSessions(recent) < COMPLETION_CRITERIA.minSessions) return false;

  const weighted = recent.reduce((sum, r) => sum + resultWeight(r), 0);
  return weighted / recent.length >= COMPLETION_CRITERIA.minAccuracy;
}

export function appendResults(
  prior: LevelResult[],
  toAppend: LevelResult[],
): LevelResult[] {
  if (toAppend.length === 0) return prior;
  const next = [...prior, ...toAppend];
  // Trim per-level history.
  const byLevel = new Map<string, LevelResult[]>();
  for (const r of next) {
    const arr = byLevel.get(r.levelId) ?? [];
    arr.push(r);
    byLevel.set(r.levelId, arr);
  }
  const out: LevelResult[] = [];
  byLevel.forEach((arr) => {
    const trimmed = arr.slice(-COMPLETION_CRITERIA.maxRetainedResultsPerLevel);
    out.push(...trimmed);
  });
  out.sort((a, b) => a.ts.localeCompare(b.ts));
  return out;
}

export type LevelAccuracySummary = {
  sessionsSeen: number;
  totalGraded: number;
  recentCorrect: number;
  recentWindow: number;
  recentAccuracy: number | null;
};

export function summarizeLevelProgress(
  progress: TrackProgress,
  levelId: string,
): LevelAccuracySummary {
  const sessions = progress.levelSessionCounts[levelId] ?? 0;
  const all = progress.recentResults.filter((r) => r.levelId === levelId);
  const recent = all.slice(-COMPLETION_CRITERIA.accuracyWindow);
  // Weighted accuracy mirrors `levelMeetsCompletion`: a hint-assisted
  // correct answer only contributes half a point.
  const weighted = recent.reduce((sum, r) => sum + resultWeight(r), 0);
  const recentAccuracy = recent.length === 0 ? null : weighted / recent.length;
  return {
    sessionsSeen: sessions,
    totalGraded: all.length,
    // For display, count clean-correct as the "headline" correct number;
    // hint-assisted answers are reflected in the accuracy score.
    recentCorrect: recent.filter((r) => r.correct && !r.usedHint).length,
    recentWindow: recent.length,
    recentAccuracy,
  };
}
