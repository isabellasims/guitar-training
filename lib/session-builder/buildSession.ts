import type {
  ReviewItem,
  Session,
  SessionCard,
  SessionSlot,
  Settings,
  TrackId,
} from "@/lib/domain/types";
import type { BuiltCard } from "@/lib/cards/types";
import { getSettings, getTrackProgress } from "@/lib/db/index";
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
  explainerForLevel,
  practiceCardsForLevel,
} from "@/lib/curriculum/cardsForLevel";
import { needsExplainer } from "@/lib/curriculum/explainerGate";

const TRACK_A_KEY_DEFAULT = { tonicMidi: 60, keyLabel: "C major" } as const;
const TRACK_A_KEY_MINOR = { tonicMidi: 57, keyLabel: "A minor" } as const;

/** Per `rules.md` §5 step 1 — soft cap with ±20% tolerance. */
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
};

function durationSec(card: { cardTemplateId: string }): number {
  return CARD_DURATION_SEC[card.cardTemplateId] ?? 60;
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

function pickPractice(levelId: string, max: number): BuiltCard[] {
  const pool = practiceCardsForLevel(levelId);
  if (pool.length === 0) return [];
  return shuffle(pool).slice(0, Math.max(1, max));
}

/**
 * `rules.md` §5 Step 3 says "include at least one production card and one recognition card
 * if both card types exist for this level." This enforces that mix when possible.
 */
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

function trackACurrentKey(byTrack: ProgressByTrack): {
  tonicMidi: number;
  keyLabel: string;
} {
  const a = byTrack.A;
  const cur = a?.currentNodeId ?? "A-1";
  const lvl = getLevel(cur);
  if (!lvl) return TRACK_A_KEY_DEFAULT;
  // A-2 and A-6 anchor minor tonic; A-11+ uses A minor too (chord tones / pent).
  if (
    lvl.id === "A-2" ||
    lvl.id === "A-6" ||
    (lvl.level >= 11 && lvl.level <= 14)
  ) {
    return TRACK_A_KEY_MINOR;
  }
  return TRACK_A_KEY_DEFAULT;
}

function buildWarmupCard(
  byTrack: ProgressByTrack,
): BuiltCard<"drone-listen-warmup"> {
  const key = trackACurrentKey(byTrack);
  return {
    id: crypto.randomUUID(),
    templateId: "drone-listen-warmup",
    trackId: "A",
    nodeId: byTrack.A?.currentNodeId ?? "A-1",
    parameters: { tonicMidi: key.tonicMidi, keyLabel: key.keyLabel },
  };
}

function buildAfterglowCard(
  byTrack: ProgressByTrack,
): BuiltCard<"freeplay-afterglow"> {
  const a11Done = byTrack.A?.completedNodeIds.includes("A-11") ?? false;
  const key = a11Done ? TRACK_A_KEY_MINOR : trackACurrentKey(byTrack);
  return {
    id: crypto.randomUUID(),
    templateId: "freeplay-afterglow",
    trackId: "A",
    nodeId: byTrack.A?.currentNodeId ?? "A-1",
    parameters: {
      tonicMidi: key.tonicMidi,
      keyLabel: key.keyLabel,
      durationSec: 90,
      prompt: a11Done
        ? "Backing track later — for now, drone-only freeplay. Target chord tones when you can."
        : "Drone-only freeplay. Phrase a few lines and land on home.",
    },
  };
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

/** Pure-list filter used by the assembler; exported for verification. */
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

type CoreSlots = {
  warmup: SessionCard;
  foundation: SessionCard[];
  trackA: SessionCard[];
  trackB: SessionCard[];
  trackC: SessionCard[];
  trackD: SessionCard[];
  trackE: SessionCard[];
  reviews: SessionCard[];
  afterglow: SessionCard;
};

function fmtCurrentLevel(t: TrackId, byTrack: ProgressByTrack): string | null {
  return currentLevelIdForTrack(t, byTrack);
}

function buildFoundationGate(
  byTrack: ProgressByTrack,
): SessionCard[] {
  // §5 Slot 2: order A, C, B, D, E.
  const order: TrackId[] = ["A", "C", "B", "D", "E"];
  const out: SessionCard[] = [];
  for (const t of order) {
    if (!isTrackEntered(t, byTrack)) continue;
    const cur = fmtCurrentLevel(t, byTrack);
    if (!cur) continue;
    if (!needsExplainer(byTrack[t], cur)) continue;
    const explainer = explainerForLevel(cur);
    if (!explainer) continue;
    out.push(builtToSession(explainer, "foundation-gate"));
  }
  return out;
}

function buildTrackBlock(
  trackId: TrackId,
  slot: SessionSlot,
  byTrack: ProgressByTrack,
  maxCards: number,
  mixProductionAndRecognition: boolean,
): SessionCard[] {
  if (!isTrackEntered(trackId, byTrack)) return [];
  const cur = fmtCurrentLevel(trackId, byTrack);
  if (!cur) return [];
  // If a Foundation level still needs its explainer, the practice cards are
  // GATED until the gate runs. The gate card is in this same session at Slot 2,
  // so we still emit practice — gating is enforced by ordering, not by skipping.
  const built = mixProductionAndRecognition
    ? pickPracticeMixed(cur, maxCards)
    : pickPractice(cur, maxCards);
  return built.map((b) => builtToSession(b, slot));
}

function totalDuration(cards: SessionCard[]): number {
  return cards.reduce((sum, c) => sum + durationSec(c), 0);
}

/**
 * Trim per `rules.md` §5 Step 3, preserving never-drop guarantees.
 */
function trim(slots: CoreSlots, targetSec: number): CoreSlots {
  const cap = targetSec * 1.2; // ±20% tolerance.
  const compute = () =>
    [
      slots.warmup,
      ...slots.foundation,
      ...slots.trackA,
      ...slots.trackB,
      ...slots.trackC,
      ...slots.trackD,
      ...slots.trackE,
      ...slots.reviews,
      slots.afterglow,
    ].reduce((s, c) => s + durationSec(c), 0);

  // 1. Drop reviews lowest-priority first (queue is sorted by dueDate asc; lowest priority = last).
  while (compute() > cap && slots.reviews.length > 0) {
    slots.reviews.pop();
  }
  // 2. Drop second card of D / E.
  if (compute() > cap && slots.trackD.length > 1) slots.trackD.pop();
  if (compute() > cap && slots.trackE.length > 1) slots.trackE.pop();
  // 3. Drop second card of C.
  if (compute() > cap && slots.trackC.length > 1) slots.trackC.pop();
  // 4. Drop second card of B.
  if (compute() > cap && slots.trackB.length > 1) slots.trackB.pop();
  // 5. Drop third card of A.
  if (compute() > cap && slots.trackA.length > 2) slots.trackA.pop();

  return slots;
}

function flatten(slots: CoreSlots): SessionCard[] {
  return [
    slots.warmup,
    ...slots.foundation,
    ...slots.trackA,
    ...slots.trackB,
    ...slots.trackC,
    ...slots.trackD,
    ...slots.trackE,
    ...slots.reviews,
    slots.afterglow,
  ];
}

async function loadProgress(): Promise<ProgressByTrack> {
  const [a, b, c, d, e] = await Promise.all([
    getTrackProgress("A"),
    getTrackProgress("B"),
    getTrackProgress("C"),
    getTrackProgress("D"),
    getTrackProgress("E"),
  ]);
  return { A: a, B: b, C: c, D: d, E: e };
}

/**
 * Pure variant of `buildNewSession` — takes pre-fetched inputs.
 * `rules.md` §5 algorithm runs here so it can be unit-tested without Dexie.
 */
export function assembleSession(input: {
  quick: boolean;
  targetMinutes: number;
  byTrack: ProgressByTrack;
  dueReviews: ReviewItem[];
}): Session {
  const targetSec = input.targetMinutes * 60;

  // Slot 1.
  const warmupReview = filterAllowedReviews(input.dueReviews, input.byTrack, 1);
  const warmup: SessionCard =
    warmupReview[0]
      ? { ...warmupReview[0], slot: "warmup" }
      : builtToSession(buildWarmupCard(input.byTrack), "warmup");

  // Slot 2.
  const foundation = buildFoundationGate(input.byTrack);

  // Slots 3–7.
  const aMax = input.quick ? 1 : 3;
  const bMax = input.quick ? 1 : 2;
  const cMax = input.quick ? 1 : 2;
  const deMax = input.quick ? 1 : 2;

  const trackA = buildTrackBlock("A", "track-A", input.byTrack, aMax, true);
  const trackB = buildTrackBlock("B", "track-B", input.byTrack, bMax, false);
  const trackC = buildTrackBlock("C", "track-C", input.byTrack, cMax, false);
  const trackD = buildTrackBlock("D", "track-D", input.byTrack, deMax, false);
  const trackE = buildTrackBlock("E", "track-E", input.byTrack, deMax, false);

  // Slot 8.
  const warmupIsReview =
    warmup.slot === "warmup" && warmup.reviewItemId != null;
  const reviewSoftCap = input.quick ? 0 : 5 - (warmupIsReview ? 1 : 0);
  const remainingDue = input.dueReviews.filter(
    (r) => r.id !== warmup.reviewItemId,
  );
  const moreReviews = filterAllowedReviews(
    remainingDue,
    input.byTrack,
    Math.max(0, reviewSoftCap),
  );

  // Slot 9.
  const afterglow = builtToSession(
    buildAfterglowCard(input.byTrack),
    "afterglow",
  );

  let slots: CoreSlots = {
    warmup,
    foundation,
    trackA,
    trackB,
    trackC,
    trackD,
    trackE,
    reviews: moreReviews,
    afterglow,
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

/**
 * Build a fresh session per `public/rules.md` §5.
 * Pulls live progress + due reviews from Dexie and delegates to `assembleSession`.
 */
export async function buildNewSession(options: {
  quick: boolean;
}): Promise<Session> {
  const settings = (await getSettings()) ?? null;
  const targetMinutes = options.quick
    ? 5
    : settings?.targetSessionMinutes ?? 30;

  const byTrack = await loadProgress();
  // 13 = warmup-1 + reviewSoftCap-5 + buffer for filtering.
  const dueReviews = await getDueReviewCards(13);

  return assembleSession({
    quick: options.quick,
    targetMinutes,
    byTrack,
    dueReviews,
  });
}

export type { Settings };
export { totalDuration };
