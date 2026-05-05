import type {
  ReviewItem,
  Session,
  Settings,
  Streak,
  TrackProgress,
} from "@/lib/domain/types";

export const DB_NAME = "tonic-db";
export const DB_VERSION = 1;

export type SettingsRow = Settings & { id: string };
export type StreakRow = Streak & { id: string };

export interface TonicDBSchema {
  settings: SettingsRow;
  trackProgress: TrackProgress & { id: string };
  reviewItems: ReviewItem;
  sessions: Session;
  streak: StreakRow;
}
