import { defaultSettings, type Streak, type TrackId } from "@/lib/domain/types";
import {
  getSettings,
  getStreak,
  getTrackProgress,
  putSettings,
  putStreak,
  putTrackProgress,
} from "@/lib/db/index";
import { getLevelsForTrack } from "@/lib/curriculum/levels";
import {
  unlockedLevelIdsForTrack,
  type ProgressByTrack,
} from "@/lib/curriculum/prerequisites";

const emptyStreak: Streak = {
  currentStreak: 0,
  longestStreak: 0,
  lastSessionDate: null,
};

export async function ensureDbSeeded(): Promise<void> {
  const [settings, streak] = await Promise.all([getSettings(), getStreak()]);
  if (!settings) {
    await putSettings(defaultSettings);
  }
  if (!streak) {
    await putStreak(emptyStreak);
  }
}

async function loadProgressSnapshot(): Promise<ProgressByTrack> {
  const ids: TrackId[] = ["A", "B", "C", "D", "E", "F"];
  const rows = await Promise.all(ids.map((id) => getTrackProgress(id)));
  const out: ProgressByTrack = {};
  ids.forEach((id, i) => {
    out[id] = rows[i];
  });
  return out;
}

async function seedTrackIfMissing(trackId: TrackId): Promise<void> {
  const existing = await getTrackProgress(trackId);
  if (existing) return;
  const levels = getLevelsForTrack(trackId);
  const first = levels[0];
  if (!first) return;
  const byTrack = await loadProgressSnapshot();
  await putTrackProgress({
    trackId,
    currentNodeId: first.id,
    currentLevel: first.level,
    unlockedNodeIds: unlockedLevelIdsForTrack(trackId, byTrack),
    completedNodeIds: [],
    seenExplainerLevelIds: [],
    levelSessionCounts: {},
    recentResults: [],
  });
}

/** Tracks A–F: seeded with the first level current; nothing completed. */
export async function ensureTrackProgressSeeded(): Promise<void> {
  await Promise.all([
    seedTrackIfMissing("A"),
    seedTrackIfMissing("B"),
    seedTrackIfMissing("C"),
    seedTrackIfMissing("D"),
    seedTrackIfMissing("E"),
    seedTrackIfMissing("F"),
  ]);
}
