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
import {
  buildTrackIntroCard,
  shouldShowTrackIntro,
} from "@/lib/curriculum/trackIntros";

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

/** Per-track block: optional intro → optional foundation gate → practice cards. */
type TrackBlock = {
  trackId: TrackId;
  intro: SessionCard | null;
  foundation: SessionCard | null;
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
            : "track-E";

  const intro = shouldShowTrackIntro(byTrack[trackId])
    ? builtToSession(buildTrackIntroCard(trackId, cur), "track-intro")
    : null;

  let foundation: SessionCard | null = null;
  if (needsExplainer(byTrack[trackId], cur)) {
    const explainer = explainerForLevel(cur);
    if (explainer) {
      foundation = builtToSession(explainer, "foundation-gate");
    }
  }

  const built = mixProductionAndRecognition
    ? pickPracticeMixed(cur, maxPractice)
    : pickPractice(cur, maxPractice);
  const practice = built.map((b) => builtToSession(b, slot));

  return { trackId, intro, foundation, practice };
}

type CoreSlots = {
  warmup: SessionCard;
  trackBlocks: TrackBlock[];
  reviews: SessionCard[];
  afterglow: SessionCard;
};

function totalSeconds(slots: CoreSlots): number {
  let total = durationSec(slots.warmup) + durationSec(slots.afterglow);
  for (const b of slots.trackBlocks) {
    if (b.intro) total += durationSec(b.intro);
    if (b.foundation) total += durationSec(b.foundation);
    total += b.practice.reduce((s, c) => s + durationSec(c), 0);
  }
  total += slots.reviews.reduce((s, c) => s + durationSec(c), 0);
  return total;
}

/**
 * Trim per `rules.md` §5 Step 3, preserving never-drop guarantees.
 * Order: reviews → second card of D/E → C → B → third card of A.
 * Never drops: warmup, track intros, foundation gates, first card of any track block, afterglow.
 */
function trim(slots: CoreSlots, targetSec: number): CoreSlots {
  const cap = targetSec * 1.2;
  const blockFor = (t: TrackId) =>
    slots.trackBlocks.find((b) => b.trackId === t);

  while (totalSeconds(slots) > cap && slots.reviews.length > 0) {
    slots.reviews.pop();
  }
  for (const t of ["D", "E", "C", "B"] as TrackId[]) {
    const block = blockFor(t);
    if (
      totalSeconds(slots) > cap &&
      block &&
      block.practice.length > 1
    ) {
      block.practice.pop();
    }
  }
  const a = blockFor("A");
  if (totalSeconds(slots) > cap && a && a.practice.length > 2) {
    a.practice.pop();
  }
  return slots;
}

function flatten(slots: CoreSlots): SessionCard[] {
  const out: SessionCard[] = [slots.warmup];
  for (const b of slots.trackBlocks) {
    if (b.intro) out.push(b.intro);
    if (b.foundation) out.push(b.foundation);
    out.push(...b.practice);
  }
  out.push(...slots.reviews);
  out.push(slots.afterglow);
  return out;
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
 * Cards are grouped per-track: each track finishes (intro → foundation → practice)
 * before moving to the next, with reviews pooled before the afterglow.
 */
export function assembleSession(input: {
  quick: boolean;
  targetMinutes: number;
  byTrack: ProgressByTrack;
  dueReviews: ReviewItem[];
}): Session {
  const targetSec = input.targetMinutes * 60;

  const warmupReview = filterAllowedReviews(input.dueReviews, input.byTrack, 1);
  const warmup: SessionCard =
    warmupReview[0]
      ? { ...warmupReview[0], slot: "warmup" }
      : builtToSession(buildWarmupCard(input.byTrack), "warmup");

  const aMax = input.quick ? 1 : 3;
  const bMax = input.quick ? 1 : 2;
  const cMax = input.quick ? 1 : 2;
  const deMax = input.quick ? 1 : 2;

  const trackOrder: TrackId[] = ["A", "B", "C", "D", "E"];
  const blockMaxes: Record<TrackId, number> = {
    A: aMax,
    B: bMax,
    C: cMax,
    D: deMax,
    E: deMax,
  };

  const trackBlocks: TrackBlock[] = [];
  for (const t of trackOrder) {
    const block = buildTrackBlock(
      t,
      input.byTrack,
      blockMaxes[t],
      t === "A",
    );
    if (block) trackBlocks.push(block);
  }

  const warmupIsReview =
    warmup.slot === "warmup" && warmup.reviewItemId != null;
  const reviewSoftCap = input.quick ? 0 : 5 - (warmupIsReview ? 1 : 0);
  const remainingDue = input.dueReviews.filter(
    (r) => r.id !== warmup.reviewItemId,
  );
  const reviews = filterAllowedReviews(
    remainingDue,
    input.byTrack,
    Math.max(0, reviewSoftCap),
  );

  const afterglow = builtToSession(
    buildAfterglowCard(input.byTrack),
    "afterglow",
  );

  let slots: CoreSlots = {
    warmup,
    trackBlocks,
    reviews,
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
 * Build a fresh session per `public/rules.md` §5 (with per-track grouping override).
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
  const dueReviews = await getDueReviewCards(13);

  return assembleSession({
    quick: options.quick,
    targetMinutes,
    byTrack,
    dueReviews,
  });
}

export type { Settings };
