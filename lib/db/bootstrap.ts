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

async function seedTrackIfMissing(trackId: TrackId): Promise<void> {
  const existing = await getTrackProgress(trackId);
  if (existing) return;
  const levels = getLevelsForTrack(trackId);
  const first = levels[0];
  if (!first) return;
  await putTrackProgress({
    trackId,
    currentNodeId: first.id,
    currentLevel: first.level,
    unlockedNodeIds: levels.map((l) => l.id),
    completedNodeIds: [],
    seenExplainerLevelIds: [],
    levelSessionCounts: {},
    recentResults: [],
  });
}

/** Tracks A–E: seeded with the first level current; nothing completed. */
export async function ensureTrackProgressSeeded(): Promise<void> {
  await Promise.all([
    seedTrackIfMissing("A"),
    seedTrackIfMissing("B"),
    seedTrackIfMissing("C"),
    seedTrackIfMissing("D"),
    seedTrackIfMissing("E"),
  ]);
}
