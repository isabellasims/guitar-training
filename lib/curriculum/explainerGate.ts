import type { TrackProgress } from "@/lib/domain/types";
import { getLevel } from "@/lib/curriculum/levels";

/**
 * `rules.md` §2 + §8: a Foundation level’s practice cards may NOT be delivered
 * before its concept-explainer has been completed at least once.
 */
export function needsExplainer(
  progress: TrackProgress | undefined,
  levelId: string,
): boolean {
  const lvl = getLevel(levelId);
  if (!lvl) return false;
  if (lvl.type !== "F") return false;
  return !(progress?.seenExplainerLevelIds.includes(levelId) ?? false);
}
