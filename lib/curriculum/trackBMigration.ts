import type { TrackProgress } from "@/lib/domain/types";
import { getLevelsForTrack } from "@/lib/curriculum/levels";

/**
 * One-time remap when Track B gained string-by-string levels (2025 curriculum).
 * Old B-2 (E+A mix) → B-3; old B-3..B-13 → B-8..B-18.
 */
const LEGACY_TO_NEW: Record<string, string> = {
  "B-2": "B-3",
  "B-3": "B-8",
  "B-4": "B-9",
  "B-5": "B-10",
  "B-6": "B-11",
  "B-7": "B-12",
  "B-8": "B-13",
  "B-9": "B-14",
  "B-10": "B-15",
  "B-11": "B-16",
  "B-12": "B-17",
  "B-13": "B-18",
};

const MIGRATION_FLAG = "trackBCurriculumV2";

export function migrateTrackBProgress(prog: TrackProgress): TrackProgress {
  if (prog.trackId !== "B") return prog;
  const meta = prog as TrackProgress & { curriculumVersion?: string };
  if (meta.curriculumVersion === MIGRATION_FLAG) return prog;

  const remapId = (id: string) => LEGACY_TO_NEW[id] ?? id;
  const remapKeys = (rec: Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(rec)) {
      const nk = remapId(k);
      out[nk] = (out[nk] ?? 0) + v;
    }
    return out;
  };
  const remapResults = prog.recentResults.map((r) => ({
    ...r,
    levelId: remapId(r.levelId),
  }));

  const levels = getLevelsForTrack("B");
  const completed = Array.from(
    new Set(prog.completedNodeIds.map(remapId)),
  ).filter((id) => levels.some((l) => l.id === id));
  const seen = Array.from(
    new Set(prog.seenExplainerLevelIds.map(remapId)),
  ).filter((id) => levels.some((l) => l.id === id));

  return {
    ...prog,
    curriculumVersion: MIGRATION_FLAG,
    completedNodeIds: completed,
    seenExplainerLevelIds: seen,
    levelSessionCounts: remapKeys(prog.levelSessionCounts),
    recentResults: remapResults,
    unlockedNodeIds: levels.map((l) => l.id),
  } as TrackProgress & { curriculumVersion?: string };
}
