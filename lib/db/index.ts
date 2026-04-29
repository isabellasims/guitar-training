import Dexie, { type Table } from "dexie";

import type {
  ReviewItem,
  Session,
  Settings,
  Streak,
  TrackProgress,
} from "@/lib/domain/types";

import { DB_NAME, DB_VERSION } from "@/lib/db/schema";
import type { SettingsRow, StreakRow } from "@/lib/db/schema";

class TonicDatabase extends Dexie {
  settings!: Table<SettingsRow, string>;
  trackProgress!: Table<TrackProgress & { id: string }, string>;
  reviewItems!: Table<ReviewItem, string>;
  sessions!: Table<Session, string>;
  streak!: Table<StreakRow, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      settings: "id",
      trackProgress: "id",
      reviewItems: "id, dueDate, cardTemplateId",
      sessions: "id, startedAt",
      streak: "id",
    });
  }
}

export const db = new TonicDatabase();

export async function getSettings(): Promise<Settings | null> {
  const row = await db.settings.get("default");
  if (!row) return null;
  const { id, ...rest } = row;
  void id;
  return rest;
}

export async function putSettings(settings: Settings): Promise<void> {
  await db.settings.put({ id: "default", ...settings });
}

export async function getStreak(): Promise<Streak | null> {
  const row = await db.streak.get("default");
  if (!row) return null;
  const { id, ...rest } = row;
  void id;
  return rest;
}

export async function putStreak(streak: Streak): Promise<void> {
  await db.streak.put({ id: "default", ...streak });
}

export async function getTrackProgress(
  trackId: string,
): Promise<(TrackProgress & { id: string }) | undefined> {
  return db.trackProgress.get(trackId);
}

export async function putTrackProgress(
  progress: TrackProgress,
): Promise<void> {
  await db.trackProgress.put({ ...progress, id: progress.trackId });
}
