/** Single-user local app: tracks A–E. F (song vocab) deferred. */
export type TrackId = "A" | "B" | "C" | "D" | "E";

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
  grading: "pending" | "correct" | "incorrect" | "skipped";
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
