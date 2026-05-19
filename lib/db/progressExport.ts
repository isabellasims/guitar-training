/**
 * Export / import the entire user state as a JSON blob. Used by the
 * "Export progress" / "Import progress" buttons in Settings so users can
 * carry their curriculum progress, streaks, custom flashcards, stars,
 * skipped cards, and backing tracks across devices.
 *
 * Format is intentionally simple — every Dexie table becomes an array
 * under the same key. The top-level `schemaVersion` tracks the current
 * Dexie schema so future imports can refuse incompatible exports.
 */
import { db } from "@/lib/db/index";
import { DB_VERSION } from "@/lib/db/schema";

/** Bumped when the export shape (not the DB schema) changes. */
const EXPORT_FORMAT_VERSION = 1;

export type ProgressExport = {
  /** Identifier so import knows it's looking at the right thing. */
  app: "tonic-guitar-training";
  /** Bumped on breaking changes to this file's shape. */
  formatVersion: number;
  /** Dexie schema version at export time. */
  schemaVersion: number;
  exportedAt: string;
  data: {
    settings: unknown[];
    trackProgress: unknown[];
    reviewItems: unknown[];
    sessions: unknown[];
    streak: unknown[];
    starredCards: unknown[];
    customCards: unknown[];
    skippedCards: unknown[];
    backingTracks: unknown[];
  };
};

/** Snapshot every table to a serializable object. */
export async function exportProgress(): Promise<ProgressExport> {
  const [
    settings,
    trackProgress,
    reviewItems,
    sessions,
    streak,
    starredCards,
    customCards,
    skippedCards,
    backingTracks,
  ] = await Promise.all([
    db.settings.toArray(),
    db.trackProgress.toArray(),
    db.reviewItems.toArray(),
    db.sessions.toArray(),
    db.streak.toArray(),
    db.starredCards.toArray(),
    db.customCards.toArray(),
    db.skippedCards.toArray(),
    db.backingTracks.toArray(),
  ]);
  return {
    app: "tonic-guitar-training",
    formatVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      settings,
      trackProgress,
      reviewItems,
      sessions,
      streak,
      starredCards,
      customCards,
      skippedCards,
      backingTracks,
    },
  };
}

/** Trigger a browser download of the exported state. */
export async function downloadProgressExport(): Promise<void> {
  const snapshot = await exportProgress();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = snapshot.exportedAt.slice(0, 10).replace(/-/g, "");
  a.href = url;
  a.download = `tonic-progress-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick before revoking the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type ImportResult = {
  counts: Record<keyof ProgressExport["data"], number>;
};

/**
 * Replace the contents of every table with the snapshot. Wraps every
 * write in a single Dexie transaction so a failure rolls back cleanly.
 *
 * Skipped fields are tolerated — an older export missing `backingTracks`
 * just leaves the existing rows in that table untouched.
 */
export async function importProgress(
  payload: ProgressExport,
): Promise<ImportResult> {
  if (
    !payload ||
    payload.app !== "tonic-guitar-training" ||
    typeof payload.formatVersion !== "number"
  ) {
    throw new Error("This file isn't a Tonic progress export.");
  }
  if (payload.formatVersion > EXPORT_FORMAT_VERSION) {
    throw new Error(
      "This export was made by a newer version of the app — update before importing.",
    );
  }
  const d = payload.data ?? ({} as ProgressExport["data"]);

  const counts: ImportResult["counts"] = {
    settings: 0,
    trackProgress: 0,
    reviewItems: 0,
    sessions: 0,
    streak: 0,
    starredCards: 0,
    customCards: 0,
    skippedCards: 0,
    backingTracks: 0,
  };

  await db.transaction(
    "rw",
    [
      db.settings,
      db.trackProgress,
      db.reviewItems,
      db.sessions,
      db.streak,
      db.starredCards,
      db.customCards,
      db.skippedCards,
      db.backingTracks,
    ],
    async () => {
      const replace = async <T>(
        table: { clear: () => Promise<void>; bulkPut: (rows: T[]) => Promise<unknown> },
        rows: unknown[] | undefined,
        key: keyof ImportResult["counts"],
      ) => {
        if (!Array.isArray(rows)) return;
        await table.clear();
        if (rows.length > 0) {
          await table.bulkPut(rows as T[]);
        }
        counts[key] = rows.length;
      };
      await replace(db.settings, d.settings, "settings");
      await replace(db.trackProgress, d.trackProgress, "trackProgress");
      await replace(db.reviewItems, d.reviewItems, "reviewItems");
      await replace(db.sessions, d.sessions, "sessions");
      await replace(db.streak, d.streak, "streak");
      await replace(db.starredCards, d.starredCards, "starredCards");
      await replace(db.customCards, d.customCards, "customCards");
      await replace(db.skippedCards, d.skippedCards, "skippedCards");
      await replace(db.backingTracks, d.backingTracks, "backingTracks");
    },
  );

  return { counts };
}

/** Read a File (from a file <input>) and parse it into a ProgressExport. */
export async function parseImportFile(file: File): Promise<ProgressExport> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  return parsed as ProgressExport;
}
