import type {
  ReviewItem,
  Session,
  SessionCard,
  SessionSlot,
  Settings,
  TrackId,
} from "@/lib/domain/types";
import type { BuiltCard, CardTemplateId } from "@/lib/cards/types";
import {
  getSettings,
  getTrackProgress,
  popAllSkippedCards,
} from "@/lib/db/index";
import {
  getDueReviewCards,
  reviewItemToSessionCard,
} from "@/lib/db/reviewOps";
import {
  currentLevelIdForTrack,
  isLevelUnlocked,
  isTrackEntered,
  type ProgressByTrack,
} from "@/lib/curriculum/prerequisites";
import { getLevel } from "@/lib/curriculum/levels";
import {
  isChordDrillPreflightCard,
  practiceCardsForLevel,
} from "@/lib/curriculum/cardsForLevel";
import {
  buildTrackIntroCard,
  shouldShowTrackIntro,
} from "@/lib/curriculum/trackIntros";

/** Supported session lengths (minutes). */
export const SESSION_LENGTH_MINUTES = [5, 15, 30] as const;
export type SessionLengthMinutes = (typeof SESSION_LENGTH_MINUTES)[number];

/** Max previously-skipped cards resurfaced per session (rest stay queued). */
export const MAX_RESURFACED_PER_SESSION = 3;

const CARD_DURATION_SEC: Record<string, number> = {
  "concept-explainer": 90,
  "drone-degree-play": 90,
  "functional-ear-mc": 45,
  "note-finding-play": 30,
  "shape-recall-play": 120,
  "chord-tone-targeting-play": 120,
  "scale-explore-play": 90,
  "chord-change-mc": 60,
  "drone-listen-warmup": 35,
  "freeplay-afterglow": 90,
  "interval-play": 60,
  "melodic-dictation": 75,
};

export function durationSecForCard(card: {
  cardTemplateId: string;
}): number {
  return CARD_DURATION_SEC[card.cardTemplateId] ?? 60;
}

export function estimateSessionSeconds(cards: SessionCard[]): number {
  return cards.reduce((s, c) => s + durationSecForCard(c), 0);
}

export function formatSessionEstimate(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "< 1 min";
  return `~${mins} min`;
}

function builtToSession(b: BuiltCard, slot: SessionSlot): SessionCard {
  return {
    id: b.id,
    cardTemplateId: b.templateId,
    trackId: b.trackId,
    nodeId: b.nodeId,
    parameters: b.parameters as Record<string, unknown>,
    slot,
    startedAt: null,
    completedAt: null,
    grading: "pending",
  };
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function practiceCapsForMinutes(minutes: number): Record<TrackId, number> {
  if (minutes <= 5) {
    return { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 };
  }
  if (minutes <= 15) {
    return { A: 2, B: 1, C: 1, D: 2, E: 1, F: 1 };
  }
  return { A: 3, B: 2, C: 2, D: 3, E: 2, F: 2 };
}

function pickPractice(levelId: string, max: number): BuiltCard[] {
  const pool = practiceCardsForLevel(levelId);
  if (pool.length === 0) return [];
  const sliceEnd = Math.max(1, max);
  if (max <= 1 && pool.length > 1 && isChordDrillPreflightCard(pool[0]!)) {
    return pool.slice(1, 2);
  }
  if (max >= 2 && pool.length > 0 && isChordDrillPreflightCard(pool[0]!)) {
    const rest = pool.slice(1);
    return [pool[0]!, ...rest.slice(0, max - 1)];
  }
  return pool.slice(0, sliceEnd);
}

function pickPracticeMixed(levelId: string, max: number): BuiltCard[] {
  const pool = practiceCardsForLevel(levelId);
  if (pool.length === 0) return [];
  if (max <= 1) return shuffle(pool).slice(0, 1);
  const recognition = pool.filter(
    (c) =>
      c.templateId === "functional-ear-mc" ||
      c.templateId === "chord-change-mc",
  );
  const production = pool.filter(
    (c) =>
      c.templateId !== "functional-ear-mc" &&
      c.templateId !== "chord-change-mc",
  );
  const out: BuiltCard[] = [];
  if (recognition.length > 0 && production.length > 0) {
    out.push(shuffle(production)[0]!);
    out.push(shuffle(recognition)[0]!);
  }
  while (out.length < max) {
    const remaining = pool.filter((c) => !out.includes(c));
    if (remaining.length === 0) break;
    out.push(shuffle(remaining)[0]!);
  }
  return out.slice(0, max);
}

function reviewIsAllowed(
  card: SessionCard,
  byTrack: ProgressByTrack,
): boolean {
  const lvl = getLevel(card.nodeId);
  if (!lvl) return false;
  if (!isTrackEntered(lvl.trackId, byTrack)) return false;
  if (!isLevelUnlocked(lvl.id, byTrack)) return false;
  return true;
}

export function filterAllowedReviews(
  due: ReviewItem[],
  byTrack: ProgressByTrack,
  limit: number,
): SessionCard[] {
  if (limit <= 0) return [];
  const cards = due.map(reviewItemToSessionCard);
  const allowed = cards.filter((c) => reviewIsAllowed(c, byTrack));
  return allowed.slice(0, limit).map((c) => ({ ...c, slot: "review" }));
}

type TrackBlock = {
  trackId: TrackId;
  intro: SessionCard | null;
  practice: SessionCard[];
};

function buildTrackBlock(
  trackId: TrackId,
  byTrack: ProgressByTrack,
  maxPractice: number,
  mixProductionAndRecognition: boolean,
): TrackBlock | null {
  if (!isTrackEntered(trackId, byTrack)) return null;
  const cur = currentLevelIdForTrack(trackId, byTrack);
  if (!cur) return null;

  const slot: SessionSlot =
    trackId === "A"
      ? "track-A"
      : trackId === "B"
        ? "track-B"
        : trackId === "C"
          ? "track-C"
          : trackId === "D"
            ? "track-D"
            : trackId === "E"
              ? "track-E"
              : "track-F";

  const intro = shouldShowTrackIntro(byTrack[trackId])
    ? builtToSession(buildTrackIntroCard(trackId, cur), "track-intro")
    : null;

  const built = mixProductionAndRecognition
    ? pickPracticeMixed(cur, maxPractice)
    : pickPractice(cur, maxPractice);
  const practice = built.map((b) => builtToSession(b, slot));

  return { trackId, intro, practice };
}

/** Track order: A first, F last when present, middle tracks shuffled. */
function trackBuildOrder(blocks: TrackBlock[]): TrackBlock[] {
  const byId = new Map(blocks.map((b) => [b.trackId, b]));
  const a = byId.get("A");
  const f = byId.get("F");
  const middle = shuffle(
    (["B", "C", "D", "E"] as TrackId[]).filter((t) => byId.has(t)),
  ).map((t) => byId.get(t)!);
  const out: TrackBlock[] = [];
  if (a) out.push(a);
  out.push(...middle);
  if (f) out.push(f);
  return out;
}

type CoreSlots = {
  resurfaced: SessionCard[];
  trackBlocks: TrackBlock[];
  reviews: SessionCard[];
};

function totalSeconds(slots: CoreSlots): number {
  let total = 0;
  for (const c of slots.resurfaced) total += durationSecForCard(c);
  for (const b of slots.trackBlocks) {
    if (b.intro) total += durationSecForCard(b.intro);
    total += b.practice.reduce((s, c) => s + durationSecForCard(c), 0);
  }
  total += slots.reviews.reduce((s, c) => s + durationSecForCard(c), 0);
  return total;
}

function flatten(slots: CoreSlots): SessionCard[] {
  const out: SessionCard[] = [];
  out.push(...slots.resurfaced);
  for (const b of slots.trackBlocks) {
    if (b.intro) out.push(b.intro);
    out.push(...b.practice);
  }
  out.push(...slots.reviews);
  return out;
}

function trim(slots: CoreSlots, targetSec: number): CoreSlots {
  const cap = targetSec * 1.2;
  const blockFor = (t: TrackId) =>
    slots.trackBlocks.find((b) => b.trackId === t);

  while (totalSeconds(slots) > cap && slots.reviews.length > 0) {
    slots.reviews.pop();
  }
  for (const t of ["F", "D", "E", "C", "B"] as TrackId[]) {
    const block = blockFor(t);
    if (totalSeconds(slots) > cap && block && block.practice.length > 1) {
      block.practice.pop();
    }
  }
  const a = blockFor("A");
  if (totalSeconds(slots) > cap && a && a.practice.length > 2) {
    a.practice.pop();
  }
  while (
    totalSeconds(slots) > cap &&
    slots.resurfaced.length > 0 &&
    slots.trackBlocks.some((b) => b.practice.length > 1)
  ) {
    slots.resurfaced.pop();
  }
  return slots;
}

export type ResurfacedCard = {
  id: string;
  trackId: TrackId;
  nodeId: string;
  templateId: CardTemplateId;
  parameters: Record<string, unknown>;
};

function resurfacedToSessionCard(r: ResurfacedCard): SessionCard {
  const slot: SessionSlot =
    r.trackId === "A"
      ? "track-A"
      : r.trackId === "B"
        ? "track-B"
        : r.trackId === "C"
          ? "track-C"
          : r.trackId === "D"
            ? "track-D"
            : r.trackId === "E"
              ? "track-E"
              : "track-F";
  return {
    id: r.id,
    cardTemplateId: r.templateId,
    trackId: r.trackId,
    nodeId: r.nodeId,
    parameters: r.parameters,
    slot,
    startedAt: null,
    completedAt: null,
    grading: "pending",
  };
}

/**
 * Practice-focused session: current-level work per track, optional SRS.
 * No drone warmup, maintenance reps, in-session explainers, or afterglow.
 * Foundation explainers are shown before the session starts (see SessionRunner).
 */
export function assembleSession(input: {
  targetMinutes: number;
  byTrack: ProgressByTrack;
  dueReviews: ReviewItem[];
  resurfaced?: ResurfacedCard[];
  /** Default false — use /reviews for SRS-only practice. */
  includeReviews?: boolean;
}): Session {
  const targetSec = input.targetMinutes * 60;
  const caps = practiceCapsForMinutes(input.targetMinutes);

  const trackOrder: TrackId[] = ["A", "B", "C", "D", "E", "F"];
  const trackBlocks: TrackBlock[] = [];
  for (const t of trackOrder) {
    const block = buildTrackBlock(
      t,
      input.byTrack,
      caps[t],
      t === "A",
    );
    if (block) trackBlocks.push(block);
  }

  const reviewCap = input.includeReviews
    ? input.targetMinutes <= 5
      ? 3
      : input.targetMinutes <= 15
        ? 6
        : 10
    : 0;
  const reviews = filterAllowedReviews(
    input.dueReviews,
    input.byTrack,
    reviewCap,
  );

  const resurfacedAll = input.resurfaced ?? [];
  const resurfaced = resurfacedAll
    .filter((r) => isTrackEntered(r.trackId, input.byTrack))
    .slice(0, MAX_RESURFACED_PER_SESSION)
    .map(resurfacedToSessionCard);

  let slots: CoreSlots = {
    resurfaced,
    trackBlocks: trackBuildOrder(trackBlocks),
    reviews,
  };

  slots = trim(slots, targetSec);

  const cards = flatten(slots);
  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    cards,
  };
}

/** SRS-only session (Library-style review queue). */
export function assembleReviewSession(input: {
  targetMinutes: number;
  byTrack: ProgressByTrack;
  dueReviews: ReviewItem[];
}): Session {
  const targetSec = input.targetMinutes * 60;
  const limit = input.targetMinutes <= 5 ? 5 : input.targetMinutes <= 15 ? 10 : 16;
  let reviews = filterAllowedReviews(
    input.dueReviews,
    input.byTrack,
    limit,
  );
  while (
    reviews.length > 1 &&
    reviews.reduce((s, c) => s + durationSecForCard(c), 0) > targetSec * 1.2
  ) {
    reviews = reviews.slice(0, -1);
  }
  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    cards: reviews,
  };
}

async function loadProgress(): Promise<ProgressByTrack> {
  const [a, b, c, d, e, f] = await Promise.all([
    getTrackProgress("A"),
    getTrackProgress("B"),
    getTrackProgress("C"),
    getTrackProgress("D"),
    getTrackProgress("E"),
    getTrackProgress("F"),
  ]);
  return { A: a, B: b, C: c, D: d, E: e, F: f };
}

function resolveSessionMinutes(options: {
  minutes?: number;
  quick?: boolean;
  settings: Settings | null;
}): number {
  if (options.quick) return 5;
  if (options.minutes != null) {
    const m = options.minutes;
    if (m <= 5) return 5;
    if (m <= 15) return 15;
    return 30;
  }
  const fromSettings = options.settings?.targetSessionMinutes ?? 30;
  if (fromSettings <= 5) return 5;
  if (fromSettings <= 15) return 15;
  if (fromSettings <= 30) return 30;
  return 30;
}

async function loadResurfaced(): Promise<ResurfacedCard[]> {
  try {
    const rows = await popAllSkippedCards();
    return rows.map((row) => ({
      id: row.id,
      trackId: row.trackId as TrackId,
      nodeId: row.nodeId,
      templateId: row.templateId as CardTemplateId,
      parameters: row.parameters as Record<string, unknown>,
    }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[session] popAllSkippedCards failed", err);
    return [];
  }
}

export async function buildNewSession(options: {
  /** 5, 15, or 30 — snapped to nearest supported length. */
  minutes?: number;
  /** Legacy: same as minutes=5. */
  quick?: boolean;
  includeReviews?: boolean;
}): Promise<Session> {
  const settings = (await getSettings()) ?? null;
  const targetMinutes = resolveSessionMinutes({
    minutes: options.minutes,
    quick: options.quick,
    settings,
  });

  const byTrack = await loadProgress();
  const dueReviews = await getDueReviewCards(24);
  const resurfaced = await loadResurfaced();

  return assembleSession({
    targetMinutes,
    byTrack,
    dueReviews,
    resurfaced,
    includeReviews: options.includeReviews ?? false,
  });
}

export async function buildReviewSession(options: {
  minutes?: number;
}): Promise<Session> {
  const settings = (await getSettings()) ?? null;
  const targetMinutes = resolveSessionMinutes({
    minutes: options.minutes,
    settings,
  });
  const byTrack = await loadProgress();
  const dueReviews = await getDueReviewCards(32);
  return assembleReviewSession({ targetMinutes, byTrack, dueReviews });
}

export type { Settings };
