import type { TrackId, TrackProgress } from "@/lib/domain/types";
import { LEVELS_BY_ID, getLevel, getLevelsForTrack } from "@/lib/curriculum/levels";

/** Map of trackId → completed level id set. */
export type ProgressByTrack = Partial<Record<TrackId, TrackProgress | undefined>>;

function isCompleted(byTrack: ProgressByTrack, levelId: string): boolean {
  const lvl = getLevel(levelId);
  if (!lvl) return false;
  return byTrack[lvl.trackId]?.completedNodeIds.includes(levelId) ?? false;
}

/** True iff every prerequisite level (in any track) is completed. */
export function isLevelUnlocked(
  levelId: string,
  byTrack: ProgressByTrack,
): boolean {
  const lvl = LEVELS_BY_ID[levelId];
  if (!lvl) return false;
  return lvl.prerequisiteLevelIds.every((p) => isCompleted(byTrack, p));
}

/** Return the first prerequisite that is NOT yet complete (if any). */
export function firstBlockingPrerequisite(
  levelId: string,
  byTrack: ProgressByTrack,
): string | null {
  const lvl = LEVELS_BY_ID[levelId];
  if (!lvl) return null;
  for (const p of lvl.prerequisiteLevelIds) {
    if (!isCompleted(byTrack, p)) return p;
  }
  return null;
}

/**
 * The user's "current" level for a track is the lowest level number
 * that is unlocked AND not yet completed. If everything is complete, returns the last one.
 */
export function currentLevelIdForTrack(
  trackId: TrackId,
  byTrack: ProgressByTrack,
): string | null {
  const levels = getLevelsForTrack(trackId);
  if (levels.length === 0) return null;
  for (const l of levels) {
    if (isCompleted(byTrack, l.id)) continue;
    if (isLevelUnlocked(l.id, byTrack)) return l.id;
    return null;
  }
  return levels[levels.length - 1]?.id ?? null;
}

/**
 * Per `rules.md` §4: D and E enter only after A-5 is complete.
 * A, B, C are always entered.
 */
export function isTrackEntered(
  trackId: TrackId,
  byTrack: ProgressByTrack,
): boolean {
  if (trackId === "A" || trackId === "B" || trackId === "C") return true;
  return isCompleted(byTrack, "A-5");
}
