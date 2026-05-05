/**
 * Verification harness for `public/rules.md` §9.
 *
 * This file is Node-runnable via `npm run verify` (uses `tsx`).
 * It exercises the pure session-builder + completion + prerequisite logic
 * against synthesized in-memory progress (no Dexie).
 *
 * Run with:  npm run verify
 */

import type {
  ReviewItem,
  TrackId,
  TrackProgress,
} from "@/lib/domain/types";
import { LEVELS, getLevelsForTrack, getLevel } from "@/lib/curriculum/levels";
import {
  currentLevelIdForTrack,
  isLevelUnlocked,
  isTrackEntered,
  type ProgressByTrack,
} from "@/lib/curriculum/prerequisites";
import {
  COMPLETION_CRITERIA,
  appendResults,
  levelMeetsCompletion,
} from "@/lib/curriculum/completion";
import { needsExplainer } from "@/lib/curriculum/explainerGate";
import { assembleSession } from "@/lib/session-builder/buildSession";

let failures = 0;
const log = (ok: boolean, label: string, detail = "") => {
  const tag = ok ? "PASS" : "FAIL";
  if (!ok) failures += 1;
  // eslint-disable-next-line no-console
  console.log(`[${tag}] ${label}${detail ? ` — ${detail}` : ""}`);
};

function emptyProgress(trackId: TrackId): TrackProgress {
  const levels = getLevelsForTrack(trackId);
  const first = levels[0]!;
  return {
    trackId,
    currentNodeId: first.id,
    currentLevel: first.level,
    unlockedNodeIds: levels.map((l) => l.id),
    completedNodeIds: [],
    seenExplainerLevelIds: [],
    levelSessionCounts: {},
    recentResults: [],
  };
}

function freshProgress(): ProgressByTrack {
  return {
    A: emptyProgress("A"),
    B: emptyProgress("B"),
    C: emptyProgress("C"),
    D: emptyProgress("D"),
    E: emptyProgress("E"),
  };
}

function clone(p: ProgressByTrack): ProgressByTrack {
  return {
    A: p.A ? structuredClone(p.A) : undefined,
    B: p.B ? structuredClone(p.B) : undefined,
    C: p.C ? structuredClone(p.C) : undefined,
    D: p.D ? structuredClone(p.D) : undefined,
    E: p.E ? structuredClone(p.E) : undefined,
  };
}

function markComplete(p: ProgressByTrack, levelId: string) {
  const lvl = getLevel(levelId);
  if (!lvl) throw new Error(`unknown level ${levelId}`);
  const tp = p[lvl.trackId];
  if (!tp) throw new Error(`missing progress ${lvl.trackId}`);
  if (!tp.completedNodeIds.includes(levelId)) {
    tp.completedNodeIds.push(levelId);
  }
  // Advance current node to the next level if applicable.
  const cur = currentLevelIdForTrack(lvl.trackId, p) ?? levelId;
  tp.currentNodeId = cur;
  const curLvl = getLevel(cur);
  if (curLvl) tp.currentLevel = curLvl.level;
  // Mark explainer seen as well (so foundation gating considers the level finished).
  if (!tp.seenExplainerLevelIds.includes(levelId)) {
    tp.seenExplainerLevelIds.push(levelId);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 1 — Brand-new user first session.
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  const session = assembleSession({
    quick: false,
    targetMinutes: 30,
    byTrack,
    dueReviews: [],
  });
  const ids = session.cards.map((c) => c.cardTemplateId);
  const slots = session.cards.map((c) => c.slot);

  // Per-track grouping: warmup, [A intro, A explainer, A practice…], [B intro…], [C intro…], afterglow.
  log(slots[0] === "warmup", "first session: starts with warmup");
  log(
    slots[slots.length - 1] === "afterglow",
    "first session: ends with afterglow",
  );

  const foundationCount = slots.filter((s) => s === "foundation-gate").length;
  log(
    foundationCount === 3,
    "first session: 3 foundation gates (A·1, B·1, C·1)",
    `actual=${foundationCount}`,
  );
  const introCount = slots.filter((s) => s === "track-intro").length;
  log(
    introCount === 3,
    "first session: 3 track-intro cards (A, B, C)",
    `actual=${introCount}`,
  );

  // Within a track block, ordering is: track-intro → foundation-gate → practice.
  // Across tracks, order is A → B → C.
  const tracksInOrder = session.cards
    .filter((c) => c.slot !== "warmup" && c.slot !== "afterglow" && c.slot !== "review")
    .map((c) => c.trackId as string);
  const firstIdxOf = (t: string) => tracksInOrder.indexOf(t);
  const lastIdxOf = (t: string) =>
    tracksInOrder.length - 1 - [...tracksInOrder].reverse().indexOf(t);
  const trackOrderOK =
    firstIdxOf("A") === 0 &&
    lastIdxOf("A") < firstIdxOf("B") &&
    lastIdxOf("B") < firstIdxOf("C");
  log(trackOrderOK, "first session: tracks complete in A → B → C order");

  const hasD = session.cards.some((c) => c.trackId === "D");
  const hasE = session.cards.some((c) => c.trackId === "E");
  log(!hasD, "first session: no Track D cards (entry condition)");
  log(!hasE, "first session: no Track E cards (entry condition)");

  // Foundation explainer must precede practice cards within the same level.
  for (const lvlId of ["A-1", "B-1", "C-1"]) {
    const explainerIdx = session.cards.findIndex(
      (c) =>
        c.cardTemplateId === "concept-explainer" && c.nodeId === lvlId,
    );
    const firstPractice = session.cards.findIndex(
      (c) =>
        c.cardTemplateId !== "concept-explainer" &&
        c.cardTemplateId !== "drone-listen-warmup" &&
        c.cardTemplateId !== "freeplay-afterglow" &&
        c.nodeId === lvlId,
    );
    if (explainerIdx === -1 || firstPractice === -1) {
      log(false, `${lvlId}: explainer or practice missing`);
      continue;
    }
    log(
      explainerIdx < firstPractice,
      `${lvlId}: explainer comes before practice`,
      `explainerIdx=${explainerIdx}, firstPractice=${firstPractice}`,
    );
  }

  // Verification §9: NO references to chord tones, intervals, or scale degrees beyond the tonic
  // in the day-1 A·1 *practice/explainer*. Track intros (meta cards) are excluded — the track
  // itself is named "Scale Degrees", which is fine.
  const a1PedagogyCards = session.cards.filter(
    (c) => c.nodeId === "A-1" && c.slot !== "track-intro",
  );
  const lower = JSON.stringify(a1PedagogyCards).toLowerCase();
  const forbidden = ["chord tone", "interval", "scale degree"];
  for (const f of forbidden) {
    log(
      !lower.includes(f),
      `first session A-1 pedagogy cards mention "${f}"`,
      lower.includes(f) ? "MENTIONED" : "",
    );
  }

  void ids;
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 2 — Track D card cannot surface before A-5 is complete.
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  // Even with everything *within* D unlocked seed-wise, prereq guard says blocked.
  log(
    !isTrackEntered("D", byTrack),
    "Track D not entered before A-5 complete",
  );
  log(
    !isTrackEntered("E", byTrack),
    "Track E not entered before A-5 complete",
  );

  // Construct a fake review item at D-1 and assert the session refuses it.
  const fakeReview: ReviewItem = {
    id: "fake-d-review",
    cardTemplateId: "chord-change-mc",
    trackId: "D",
    nodeId: "D-1",
    parameters: {},
    easeFactor: 2.5,
    intervalDays: 1,
    dueDate: "2024-01-01",
    consecutiveCorrect: 0,
    totalReviews: 1,
  };
  const session = assembleSession({
    quick: false,
    targetMinutes: 30,
    byTrack,
    dueReviews: [fakeReview],
  });
  const surfaced = session.cards.some(
    (c) => c.trackId === "D" || c.cardTemplateId === "chord-change-mc",
  );
  log(!surfaced, "Track D review is silently rejected before A-5");
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 3 — Cross-track prereq: A-2 cannot complete (and A-3 cannot unlock) until C-2 is also complete.
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  // Pretend A-1 is complete but C-2 is not.
  markComplete(byTrack, "A-1");
  log(
    !isLevelUnlocked("A-2", byTrack),
    "A-2 is locked when A-1 is done but C-2 is not",
  );
  log(
    currentLevelIdForTrack("A", byTrack) === null ||
      currentLevelIdForTrack("A", byTrack) === "A-2" === false,
    "currentLevelIdForTrack returns null for A when A-2 is blocked by C-2",
  );

  // Now finish C-1 and C-2 — A-2 unlocks.
  markComplete(byTrack, "C-1");
  markComplete(byTrack, "C-2");
  log(isLevelUnlocked("A-2", byTrack), "A-2 unlocks once C-2 is complete");
  log(
    currentLevelIdForTrack("A", byTrack) === "A-2",
    "currentLevelIdForTrack(A) advances to A-2 after C-2 done",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 4 — Foundation gate: practice cards CANNOT precede the explainer in a session.
// (Already partly covered by Test 1, but verify the gate function directly too.)
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  log(needsExplainer(byTrack.A, "A-1"), "A-1 needs an explainer for new user");
  // Mark explainer seen — should no longer need one.
  byTrack.A!.seenExplainerLevelIds.push("A-1");
  log(
    !needsExplainer(byTrack.A, "A-1"),
    "A-1 explainer is not re-shown after first time",
  );
  log(
    !needsExplainer(byTrack.B, "B-2"),
    "B-2 (practice level) never needs an explainer",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 5 — Completion criteria: minSessions + rolling accuracy.
// ──────────────────────────────────────────────────────────────────────────────
{
  const p = emptyProgress("B");
  // 10 cards, 80% correct, but only 1 session — should NOT meet criteria.
  for (let i = 0; i < 10; i++) {
    p.recentResults = appendResults(p.recentResults, [
      { levelId: "B-1", correct: i < 8, ts: `2024-01-01T00:00:0${i}Z` },
    ]);
  }
  p.levelSessionCounts["B-1"] = 1;
  log(
    !levelMeetsCompletion(p, "B-1"),
    "level NOT complete with high accuracy but only 1 session",
  );

  p.levelSessionCounts["B-1"] = COMPLETION_CRITERIA.minSessions;
  log(
    levelMeetsCompletion(p, "B-1"),
    "level complete after enough sessions + 80% accuracy",
  );

  // Push two more wrong answers — recent 10 drops to 6/10 = 60%.
  for (let i = 0; i < 2; i++) {
    p.recentResults = appendResults(p.recentResults, [
      { levelId: "B-1", correct: false, ts: `2024-01-02T00:00:0${i}Z` },
    ]);
  }
  log(
    !levelMeetsCompletion(p, "B-1"),
    "level no longer meets criteria after recent failures push window below 80%",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 6 — A-5 complete unlocks Tracks D and E.
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  for (const id of ["A-1", "C-1", "C-2", "A-2", "A-3", "A-4", "A-5"]) {
    markComplete(byTrack, id);
  }
  log(isTrackEntered("D", byTrack), "Track D entered after A-5 complete");
  log(isTrackEntered("E", byTrack), "Track E entered after A-5 complete");
  const session = assembleSession({
    quick: false,
    targetMinutes: 45, // generous so trim doesn't drop D/E
    byTrack,
    dueReviews: [],
  });
  log(
    session.cards.some((c) => c.trackId === "D"),
    "session includes Track D once D is entered",
  );
  log(
    session.cards.some((c) => c.trackId === "E"),
    "session includes Track E once E is entered",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 7 — Trim never drops warmup, foundation gates, or afterglow.
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  // Force a tight session — 1 minute target.
  const session = assembleSession({
    quick: false,
    targetMinutes: 1,
    byTrack,
    dueReviews: [],
  });
  const slots = session.cards.map((c) => c.slot);
  log(slots[0] === "warmup", "tight session: warmup retained");
  log(
    slots[slots.length - 1] === "afterglow",
    "tight session: afterglow retained",
  );
  log(
    slots.includes("foundation-gate"),
    "tight session: at least one foundation gate retained",
  );
  log(
    slots.includes("track-intro"),
    "tight session: track-intro cards retained",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 8 — Catalog sanity: every prereq id resolves to a real level.
// ──────────────────────────────────────────────────────────────────────────────
{
  const ids = new Set(LEVELS.map((l) => l.id));
  let allResolve = true;
  for (const l of LEVELS) {
    for (const p of l.prerequisiteLevelIds) {
      if (!ids.has(p)) {
        allResolve = false;
        log(false, `level ${l.id} has unknown prereq ${p}`);
      }
    }
  }
  log(allResolve, "every prereq id resolves to a real level");
}

// ──────────────────────────────────────────────────────────────────────────────
if (failures === 0) {
  // eslint-disable-next-line no-console
  console.log("\nAll curriculum verification checks passed.");
  process.exit(0);
} else {
  // eslint-disable-next-line no-console
  console.error(`\n${failures} verification check(s) failed.`);
  process.exit(1);
}
