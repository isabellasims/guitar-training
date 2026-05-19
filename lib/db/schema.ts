import type {
  ReviewItem,
  Session,
  Settings,
  Streak,
  TrackProgress,
} from "@/lib/domain/types";

export const DB_NAME = "tonic-db";
/**
 * Schema v4 adds `backingTracks`: user-authored chord progressions saved
 * from the Chord Explorer.
 */
export const DB_VERSION = 4;

export type SettingsRow = Settings & { id: string };
export type StreakRow = Streak & { id: string };

/**
 * One row per starred card. `cardKey` is a stable identifier — for built-in
 * curriculum cards we use `${trackId}:${nodeId}:${templateId}` so the star
 * follows the card across regenerated session instances.
 */
export type StarredCardRow = {
  cardKey: string;
  trackId?: string;
  nodeId?: string;
  templateId?: string;
  /** Optional opaque snapshot of the card's params for re-rendering later. */
  snapshot?: unknown;
  starredAt: string;
  note?: string;
};

/** User-authored flashcard. Lives entirely client-side. */
export type CustomCardRow = {
  id: string;
  title: string;
  front: string;
  back: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

/**
 * A card the user explicitly skipped in a session, queued to resurface
 * in their *next* session. The full parameter snapshot is retained so the
 * resurfaced card replays the exact prompts they walked away from.
 */
export type SkippedCardRow = {
  /** UUID; the row's id, also the BuiltCard id when resurfaced. */
  id: string;
  trackId: string;
  /** Level id (e.g. "A-7"). */
  nodeId: string;
  templateId: string;
  /** Opaque parameter snapshot, replayed verbatim. */
  parameters: unknown;
  /** ISO timestamp of when the user skipped. */
  skippedAt: string;
};

/**
 * One step in a saved backing track. Includes everything we need to
 * re-render the chord browser highlight + audition it, without re-running
 * the diatonic calculator from the saved key.
 */
export type BackingTrackStep = {
  /** Roman-numeral label as authored ("I", "vi", "V", "ii°"). */
  roman: string;
  /** Display name of the chord's root ("C", "Eb", "F#"). */
  rootName: string;
  /** "M" | "m" | "dim". */
  quality: string;
  /** Concrete root MIDI used for playback. */
  rootMidi: number;
  /** The triad voicing in MIDI, what actually plays. */
  notes: number[];
};

/**
 * A user-saved backing track from the Chord Explorer. Anchored to a key
 * for display + reload, plus a sequence of chord steps and the playback
 * settings the user picked when they saved it.
 */
export type BackingTrackRow = {
  id: string;
  name: string;
  /** Tonic MIDI the user picked when authoring. */
  tonicMidi: number;
  /** Tonic pitch class (0..11). Stored for key reconstruction on load. */
  tonicPc: number;
  mode: "major" | "minor";
  /** Display label of the key, e.g. "C major", "Eb minor". */
  keyLabel: string;
  steps: BackingTrackStep[];
  beatsPerChord: number;
  tempoBpm: number;
  loop: boolean;
  metronome: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface TonicDBSchema {
  settings: SettingsRow;
  trackProgress: TrackProgress & { id: string };
  reviewItems: ReviewItem;
  sessions: Session;
  streak: StreakRow;
  starredCards: StarredCardRow;
  customCards: CustomCardRow;
  skippedCards: SkippedCardRow;
  backingTracks: BackingTrackRow;
}
