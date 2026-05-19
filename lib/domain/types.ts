/** Single-user local app: tracks A–F. */
export type TrackId = "A" | "B" | "C" | "D" | "E" | "F";

export type Settings = {
  targetSessionMinutes: number;
  daysPerWeek: number;
  reminderTime: string | null;
  droneVolume: number;
  droneInstrument: "sine" | "piano" | "guitar";
  pitchDetectionEnabled: boolean;
  leftHanded: boolean;
};

export const defaultSettings: Settings = {
  targetSessionMinutes: 30,
  daysPerWeek: 5,
  reminderTime: null,
  droneVolume: 0.65,
  droneInstrument: "sine",
  pitchDetectionEnabled: true,
  leftHanded: false,
};

/** Per-card outcome appended to TrackProgress.recentResults for accuracy gating. */
export type LevelResult = {
  levelId: string;
  correct: boolean;
  ts: string;
  /**
   * True when the user enabled an in-card hint (e.g. "Show positions" on
   * note-finding / drone-degree, or "Hint" on shape-recall) at any point
   * during the prompt. Capped at 50% accuracy when computing rolling
   * level accuracy — the answer was correct, but only with assistance.
   */
  usedHint?: boolean;
};

/**
 * Curriculum is level-based per `public/rules.md`.
 * `currentNodeId` is kept as a mirror of the current level id for legacy code paths.
 */
export type TrackProgress = {
  trackId: TrackId;
  currentNodeId: string;
  currentLevel: number;
  unlockedNodeIds: string[];
  completedNodeIds: string[];
  /** Levels whose concept-explainer the user has completed at least once. */
  seenExplainerLevelIds: string[];
  /** Per-level count of sessions the level appeared in. */
  levelSessionCounts: Record<string, number>;
  /**
   * Most recent grading outcomes per level (rolling, used for accuracy completion gate).
   * Capped on write to last ~40 per level.
   */
  recentResults: LevelResult[];
};

export type ReviewItem = {
  id: string;
  cardTemplateId: string;
  trackId: TrackId;
  /** Level id the card belongs to (e.g. "A-7"). */
  nodeId: string;
  parameters: Record<string, unknown>;
  easeFactor: number;
  intervalDays: number;
  dueDate: string;
  consecutiveCorrect: number;
  totalReviews: number;
};

export type SessionCard = {
  id: string;
  cardTemplateId: string;
  trackId: TrackId;
  /** Level id (e.g. "A-7"). */
  nodeId: string;
  parameters: Record<string, unknown>;
  /** When this card was pulled from the SRS queue. */
  reviewItemId?: string;
  /** Slot from the session builder (warmup / foundation-gate / track-A / review / afterglow). */
  slot?: SessionSlot;
  startedAt: string | null;
  completedAt: string | null;
  /**
   * - `pending`            — not yet attempted.
   * - `correct`            — full credit; counts toward accuracy at 100%.
   * - `correct-with-help`  — user got it right but used a hint; counts at 50%.
   * - `incorrect`          — counts toward accuracy at 0%.
   * - `skipped`            — explicit non-attempt; doesn't count at all.
   */
  grading:
    | "pending"
    | "correct"
    | "correct-with-help"
    | "incorrect"
    | "skipped";
};

export type SessionSlot =
  | "warmup"
  | "track-intro"
  | "foundation-gate"
  | "track-A"
  | "track-B"
  | "track-C"
  | "track-D"
  | "track-E"
  | "track-F"
  | "review"
  | "afterglow";

export type Session = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  cards: SessionCard[];
};

export type Streak = {
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string | null;
};
