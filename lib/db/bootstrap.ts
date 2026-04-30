import { defaultSettings, type Streak } from "@/lib/domain/types";
import {
  getSettings,
  getStreak,
  getTrackProgress,
  putSettings,
  putStreak,
  putTrackProgress,
} from "@/lib/db/index";
import { TRACK_A_NODES } from "@/lib/tracks/trackA";
import { TRACK_B_NODES } from "@/lib/tracks/trackB";
import { TRACK_C_NODES } from "@/lib/tracks/trackC";
import { TRACK_D_NODES } from "@/lib/tracks/trackD";
import type { TrackId } from "@/lib/domain/types";

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

function seedTrackIfMissing(
  trackId: TrackId,
  nodes: { id: string }[],
  fallbackFirst: string,
): Promise<void> {
  return getTrackProgress(trackId).then((existing) => {
    if (existing) return;
    const ids = nodes.map((n) => n.id);
    return putTrackProgress({
      trackId,
      currentNodeId: ids[0] ?? fallbackFirst,
      unlockedNodeIds: [...ids],
      completedNodeIds: [],
    });
  });
}

/** Tracks A–D: all manual nodes unlocked; nothing completed until you earn it. */
export async function ensureTrackProgressSeeded(): Promise<void> {
  await Promise.all([
    seedTrackIfMissing("A", TRACK_A_NODES, "a-hear-tonic"),
    seedTrackIfMissing("B", TRACK_B_NODES, "b-e-string"),
    seedTrackIfMissing("C", TRACK_C_NODES, "c-am-shape-first"),
    seedTrackIfMissing("D", TRACK_D_NODES, "d-feel-moves"),
  ]);
}
