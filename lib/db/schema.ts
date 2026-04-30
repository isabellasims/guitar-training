import type {
  ReviewItem,
  Session,
  Settings,
  Streak,
  TrackProgress,
} from "@/lib/domain/types";

export const DB_NAME = "tonic-db";
/**
 * v2: switched curriculum from `a-hear-tonic`-style nodes to `A-1` levels.
 * Upgrade clears trackProgress, reviewItems, and sessions so the new
 * level-based seeds (`lib/db/bootstrap.ts`) can run cleanly.
 */
export const DB_VERSION = 2;

export type SettingsRow = Settings & { id: string };
export type StreakRow = Streak & { id: string };

export interface TonicDBSchema {
  settings: SettingsRow;
  trackProgress: TrackProgress & { id: string };
  reviewItems: ReviewItem;
  sessions: Session;
  streak: StreakRow;
}
