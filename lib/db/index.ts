import Dexie, { type Table } from "dexie";

import type {
  ReviewItem,
  Session,
  Settings,
  Streak,
  TrackId,
  TrackProgress,
} from "@/lib/domain/types";

import {
  DB_NAME,
  DB_VERSION,
  type BackingTrackRow,
  type CustomCardRow,
  type SettingsRow,
  type SkippedCardRow,
  type StarredCardRow,
  type StreakRow,
} from "@/lib/db/schema";
import { LEVELS_BY_ID, getFirstLevelId } from "@/lib/curriculum/levels";

class TonicDatabase extends Dexie {
  settings!: Table<SettingsRow, string>;
  trackProgress!: Table<TrackProgress & { id: string }, string>;
  reviewItems!: Table<ReviewItem, string>;
  sessions!: Table<Session, string>;
  streak!: Table<StreakRow, string>;
  starredCards!: Table<StarredCardRow, string>;
  customCards!: Table<CustomCardRow, string>;
  skippedCards!: Table<SkippedCardRow, string>;
  backingTracks!: Table<BackingTrackRow, string>;

  constructor() {
    super(DB_NAME);
    // v1: initial schema.
    this.version(1).stores({
      settings: "id",
      trackProgress: "id",
      reviewItems: "id, dueDate, cardTemplateId",
      sessions: "id, startedAt",
      streak: "id",
    });
    // v2: starredCards + customCards (star/save + user-authored flashcards).
    this.version(2).stores({
      settings: "id",
      trackProgress: "id",
      reviewItems: "id, dueDate, cardTemplateId",
      sessions: "id, startedAt",
      streak: "id",
      starredCards: "cardKey, starredAt, trackId, nodeId, templateId",
      customCards: "id, createdAt, updatedAt",
    });
    // v3: skippedCards — resurface skipped cards next session.
    this.version(3).stores({
      settings: "id",
      trackProgress: "id",
      reviewItems: "id, dueDate, cardTemplateId",
      sessions: "id, startedAt",
      streak: "id",
      starredCards: "cardKey, starredAt, trackId, nodeId, templateId",
      customCards: "id, createdAt, updatedAt",
      skippedCards: "id, skippedAt, trackId, nodeId",
    });
    // v4 (current): backingTracks — user-saved chord progressions from
    // the Chord Explorer.
    this.version(DB_VERSION).stores({
      settings: "id",
      trackProgress: "id",
      reviewItems: "id, dueDate, cardTemplateId",
      sessions: "id, startedAt",
      streak: "id",
      starredCards: "cardKey, starredAt, trackId, nodeId, templateId",
      customCards: "id, createdAt, updatedAt",
      skippedCards: "id, skippedAt, trackId, nodeId",
      backingTracks: "id, updatedAt, name, mode",
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

/**
 * Normalize a row read from Dexie. Older records (from previous schema
 * iterations of this personal project) may be missing fields like
 * `levelSessionCounts`, `seenExplainerLevelIds`, or `recentResults`. They
 * may also have a `currentNodeId` that was assigned before the level
 * system existed (e.g. "a-hear-tonic"); normalize that to the first level
 * of the track so the apply / session-builder code sees a real level id.
 */
function normalizeTrackProgress(
  row: (TrackProgress & { id: string }) | undefined,
): (TrackProgress & { id: string }) | undefined {
  if (!row) return row;
  let currentNodeId = row.currentNodeId;
  if (!currentNodeId || !(currentNodeId in LEVELS_BY_ID)) {
    currentNodeId = getFirstLevelId(row.trackId as TrackId);
  }
  return {
    ...row,
    currentNodeId,
    unlockedNodeIds: row.unlockedNodeIds ?? [],
    completedNodeIds: row.completedNodeIds ?? [],
    seenExplainerLevelIds: row.seenExplainerLevelIds ?? [],
    levelSessionCounts: row.levelSessionCounts ?? {},
    recentResults: row.recentResults ?? [],
  };
}

export async function getTrackProgress(
  trackId: string,
): Promise<(TrackProgress & { id: string }) | undefined> {
  const row = await db.trackProgress.get(trackId);
  return normalizeTrackProgress(row);
}

export async function putTrackProgress(
  progress: TrackProgress,
): Promise<void> {
  await db.trackProgress.put({ ...progress, id: progress.trackId });
}

// ─── Starred / saved cards ────────────────────────────────────────────────

/**
 * Stable key for a built-in curriculum card: `${trackId}:${nodeId}:${templateId}`.
 * Built each render so the star follows the card across regenerated sessions.
 */
export function cardKey(args: {
  trackId?: string;
  nodeId: string;
  templateId: string;
}): string {
  return `${args.trackId ?? "_"}:${args.nodeId}:${args.templateId}`;
}

export async function isStarred(key: string): Promise<boolean> {
  return (await db.starredCards.get(key)) != null;
}

export async function getAllStarred(): Promise<StarredCardRow[]> {
  return db.starredCards.orderBy("starredAt").reverse().toArray();
}

export async function starCard(row: StarredCardRow): Promise<void> {
  await db.starredCards.put(row);
}

export async function unstarCard(key: string): Promise<void> {
  await db.starredCards.delete(key);
}

// ─── Custom user-authored flashcards ─────────────────────────────────────

export async function getCustomCards(): Promise<CustomCardRow[]> {
  return db.customCards.orderBy("updatedAt").reverse().toArray();
}

export async function getCustomCard(
  id: string,
): Promise<CustomCardRow | undefined> {
  return db.customCards.get(id);
}

export async function putCustomCard(row: CustomCardRow): Promise<void> {
  await db.customCards.put(row);
}

export async function deleteCustomCard(id: string): Promise<void> {
  await db.customCards.delete(id);
}

// ─── Skipped cards (resurface in next session) ───────────────────────────

/**
 * Queue a card the user explicitly skipped so it resurfaces in their next
 * session. The parameter snapshot is preserved verbatim — the resurfaced
 * card replays the exact prompts the user walked away from.
 */
export async function pushSkippedCard(row: SkippedCardRow): Promise<void> {
  await db.skippedCards.put(row);
}

/**
 * Drain the skipped-card queue: return every row and delete them from the
 * table in one transaction. Caller is responsible for re-adding any rows
 * the user skips *again* in the resurfaced session.
 */
export async function popAllSkippedCards(): Promise<SkippedCardRow[]> {
  return db.transaction("rw", db.skippedCards, async () => {
    const rows = await db.skippedCards.orderBy("skippedAt").toArray();
    await db.skippedCards.clear();
    return rows;
  });
}

// ─── Backing tracks (Chord Explorer) ──────────────────────────────────────

/** List every saved backing track, newest first. */
export async function getAllBackingTracks(): Promise<BackingTrackRow[]> {
  return db.backingTracks.orderBy("updatedAt").reverse().toArray();
}

export async function getBackingTrack(
  id: string,
): Promise<BackingTrackRow | undefined> {
  return db.backingTracks.get(id);
}

export async function saveBackingTrack(row: BackingTrackRow): Promise<void> {
  await db.backingTracks.put(row);
}

export async function deleteBackingTrack(id: string): Promise<void> {
  await db.backingTracks.delete(id);
}
