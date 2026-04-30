import type { LevelResult, TrackProgress } from "@/lib/domain/types";

export const COMPLETION_CRITERIA = {
  /** Minimum sessions a level must have appeared in. */
  minSessions: 3,
  /** Minimum accuracy across the most recent N cards from this level. */
  minAccuracy: 0.8,
  /** Window size for accuracy. */
  accuracyWindow: 10,
  /** Hard cap on stored per-level recent results, to keep Dexie rows small. */
  maxRetainedResultsPerLevel: 40,
} as const;

/**
 * Whether the level meets both completion conditions.
 * Returns false if there aren’t yet enough graded cards in the window.
 */
export function levelMeetsCompletion(
  progress: TrackProgress,
  levelId: string,
): boolean {
  const sessions = progress.levelSessionCounts[levelId] ?? 0;
  if (sessions < COMPLETION_CRITERIA.minSessions) return false;

  const recent = progress.recentResults
    .filter((r) => r.levelId === levelId)
    .slice(-COMPLETION_CRITERIA.accuracyWindow);
  if (recent.length < COMPLETION_CRITERIA.accuracyWindow) return false;

  const correct = recent.filter((r) => r.correct).length;
  return correct / recent.length >= COMPLETION_CRITERIA.minAccuracy;
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
  const correct = recent.filter((r) => r.correct).length;
  const recentAccuracy = recent.length === 0 ? null : correct / recent.length;
  return {
    sessionsSeen: sessions,
    totalGraded: all.length,
    recentCorrect: correct,
    recentWindow: recent.length,
    recentAccuracy,
  };
}
