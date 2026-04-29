/** Single-user local app: tracks A–D in this phase (E/F deferred). */
export type TrackId = "A" | "B" | "C" | "D";

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
  targetSessionMinutes: 25,
  daysPerWeek: 5,
  reminderTime: null,
  droneVolume: 0.65,
  droneInstrument: "sine",
  pitchDetectionEnabled: true,
  leftHanded: false,
};

export type TrackProgress = {
  trackId: TrackId;
  currentNodeId: string;
  unlockedNodeIds: string[];
  completedNodeIds: string[];
};

export type ReviewItem = {
  id: string;
  cardTemplateId: string;
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
  parameters: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  grading: "pending" | "correct" | "incorrect" | "skipped";
};

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
