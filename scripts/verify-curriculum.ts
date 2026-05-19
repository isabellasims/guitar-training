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
    F: emptyProgress("F"),
  };
}

function clone(p: ProgressByTrack): ProgressByTrack {
  return {
    A: p.A ? structuredClone(p.A) : undefined,
    B: p.B ? structuredClone(p.B) : undefined,
    C: p.C ? structuredClone(p.C) : undefined,
    D: p.D ? structuredClone(p.D) : undefined,
    E: p.E ? structuredClone(p.E) : undefined,
    F: p.F ? structuredClone(p.F) : undefined,
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

  // Per-track grouping: warmup → due reviews (if any) → track blocks (A…E) → afterglow.
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
  // The maintenance warmup tier samples from completed levels only — a
  // brand-new user has none, so the warmup block should be empty beyond
  // the standard drone-listen warmup card.
  const warmupCardCount = session.cards.filter((c) => c.slot === "warmup")
    .length;
  log(
    warmupCardCount === 1,
    "first session: only the drone-listen warmup (no maintenance reps for a new user)",
    `actual=${warmupCardCount}`,
  );

  // Foundation explainer must precede practice cards within the same level.
  // A-1 is explainer-only (no practice), so it's not in this list.
  for (const lvlId of ["B-1", "C-1"]) {
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

  // A-1 must NOT contain any drone-degree-identify (or other practice) cards
  // — it is explainer-only.
  const a1NonExplainer = session.cards.filter(
    (c) =>
      c.nodeId === "A-1" &&
      c.cardTemplateId !== "concept-explainer" &&
      c.cardTemplateId !== "drone-listen-warmup" &&
      c.cardTemplateId !== "freeplay-afterglow" &&
      c.slot !== "track-intro",
  );
  log(
    a1NonExplainer.length === 0,
    "A-1 contains no practice cards (explainer-only)",
    a1NonExplainer.length > 0
      ? `found ${a1NonExplainer.map((c) => c.cardTemplateId).join(", ")}`
      : "",
  );

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
    "Track D not entered before A-11 complete",
  );
  log(
    !isTrackEntered("E", byTrack),
    "Track E not entered before A-11 complete",
  );
  log(
    !isTrackEntered("F", byTrack),
    "Track F not entered before A-11 + D-2 complete",
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
  log(!surfaced, "Track D review is silently rejected before A-11");
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 3 — Cross-track prereq: A-12 (Tonic A minor) requires C-2 (open A minor
// scale) before unlocking, since the user needs the minor scale shape to
// actually hear minor "home".
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  // Finish all of A-1..A-11 (Phase 1 major) without touching C-2.
  for (const id of [
    "A-1",
    "A-2",
    "A-3",
    "A-4",
    "A-5",
    "A-6",
    "A-7",
    "A-8",
    "A-9",
    "A-10",
    "A-11",
    "C-1",
  ]) {
    markComplete(byTrack, id);
  }
  log(
    !isLevelUnlocked("A-12", byTrack),
    "A-12 is locked when Phase 1 is done but C-2 is not",
  );
  log(
    currentLevelIdForTrack("A", byTrack) === null,
    "currentLevelIdForTrack returns null for A when A-12 is blocked by C-2",
  );

  // Now finish C-2 — A-12 unlocks.
  markComplete(byTrack, "C-2");
  log(isLevelUnlocked("A-12", byTrack), "A-12 unlocks once C-2 is complete");
  log(
    currentLevelIdForTrack("A", byTrack) === "A-12",
    "currentLevelIdForTrack(A) advances to A-12 after C-2 done",
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
  // No graded cards yet → can't meet criteria regardless of session count.
  p.levelSessionCounts["B-1"] = COMPLETION_CRITERIA.minSessions;
  log(
    !levelMeetsCompletion(p, "B-1"),
    "level NOT complete with no graded cards in window",
  );

  // Fill the accuracy window with correct cards spread across `minSessions`
  // distinct sessions (mastery requires both — a single marathon session
  // doesn't satisfy completion).
  p.recentResults = [];
  const sessionsToBuild = COMPLETION_CRITERIA.minSessions;
  const cardsPerSession = Math.ceil(
    COMPLETION_CRITERIA.minGraded / sessionsToBuild,
  );
  for (let s = 0; s < sessionsToBuild; s++) {
    for (let i = 0; i < cardsPerSession; i++) {
      p.recentResults = appendResults(p.recentResults, [
        {
          levelId: "B-1",
          correct: true,
          ts: `2024-01-0${s + 1}T00:00:0${i}Z`,
        },
      ]);
    }
  }
  log(
    levelMeetsCompletion(p, "B-1"),
    "level complete after enough sessions + accurate window",
  );

  // Push a batch of wrong answers — recent window's accuracy now drops
  // below the 90% threshold.
  for (let i = 0; i < COMPLETION_CRITERIA.accuracyWindow; i++) {
    p.recentResults = appendResults(p.recentResults, [
      { levelId: "B-1", correct: false, ts: `2024-02-01T00:00:0${i}Z` },
    ]);
  }
  log(
    !levelMeetsCompletion(p, "B-1"),
    "level no longer meets criteria after recent failures push window below threshold",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 6 — A-11 complete unlocks Tracks D and E (full major diatonic must
// be owned by ear before chord-function recognition).
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  for (const id of [
    "C-1",
    "A-1",
    "A-2",
    "A-3",
    "A-4",
    "A-5",
    "A-6",
    "A-7",
    "A-8",
    "A-9",
    "A-10",
    "A-11",
  ]) {
    markComplete(byTrack, id);
  }
  log(isTrackEntered("D", byTrack), "Track D entered after A-11 complete");
  log(isTrackEntered("E", byTrack), "Track E entered after A-11 complete");
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
// Test 6b — Track F entry gate (A-11 AND D-2 complete).
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  for (const id of [
    "C-1",
    "A-1",
    "A-2",
    "A-3",
    "A-4",
    "A-5",
    "A-6",
    "A-7",
    "A-8",
    "A-9",
    "A-10",
    "A-11",
  ]) {
    markComplete(byTrack, id);
  }
  log(
    !isTrackEntered("F", byTrack),
    "Track F still locked after A-11 (needs D-2 too)",
  );
  markComplete(byTrack, "D-1");
  markComplete(byTrack, "D-2");
  log(
    isTrackEntered("F", byTrack),
    "Track F entered after A-11 + D-2 complete",
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
// Test 7b — Track C ascending shape-recall variants always come before
// descending variants in a session.
// ──────────────────────────────────────────────────────────────────────────────
{
  const byTrack = freshProgress();
  // Push Track C far enough to have plenty of shape-recall pools available.
  for (const id of ["C-1", "C-2", "C-3", "C-4", "C-5"]) {
    markComplete(byTrack, id);
  }
  // Generous quotas so both ascending+descending fit in the same block.
  const session = assembleSession({
    quick: false,
    targetMinutes: 90,
    byTrack,
    dueReviews: [],
  });
  const cIdx = session.cards
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.cardTemplateId === "shape-recall-play");
  let orderingOk = true;
  // Within each level, descending must not appear before ascending.
  const seenLevels = new Set<string>();
  for (const { c, i } of cIdx) {
    void i;
    const title = (c.parameters as { title?: string }).title ?? "";
    const lower = title.toLowerCase();
    if (lower.includes("descending")) {
      // Ensure an ascending of this same level appeared earlier.
      const sameLevelAscEarlier = cIdx.some(
        ({ c: c2, i: i2 }) =>
          c2.nodeId === c.nodeId &&
          (((c2.parameters as { title?: string }).title ?? "")
            .toLowerCase()
            .includes("ascending") ||
            !((c2.parameters as { title?: string }).title ?? "")
              .toLowerCase()
              .includes("descending")) &&
          i2 < session.cards.indexOf(c),
      );
      if (!sameLevelAscEarlier) {
        orderingOk = false;
      }
    }
    seenLevels.add(c.nodeId);
  }
  log(
    orderingOk,
    "Track C shape-recall: ascending always precedes descending in a session",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 7c — Explainer-only levels (A-1 = Tonic C major, A-12 = Tonic A minor)
// complete after explainer is seen + at least one session, regardless of
// graded results.
// ──────────────────────────────────────────────────────────────────────────────
{
  const p = emptyProgress("A");
  p.levelSessionCounts["A-1"] = COMPLETION_CRITERIA.minSessions;
  log(
    !levelMeetsCompletion(p, "A-1"),
    "A-1 NOT complete with session count but no explainer-seen",
  );
  p.seenExplainerLevelIds.push("A-1");
  log(
    levelMeetsCompletion(p, "A-1"),
    "A-1 complete after explainer seen + minSessions sessions (no practice cards required)",
  );

  const q = emptyProgress("A");
  q.levelSessionCounts["A-12"] = COMPLETION_CRITERIA.minSessions;
  log(
    !levelMeetsCompletion(q, "A-12"),
    "A-12 NOT complete with session count but no explainer-seen",
  );
  q.seenExplainerLevelIds.push("A-12");
  log(
    levelMeetsCompletion(q, "A-12"),
    "A-12 complete after explainer seen + minSessions sessions",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 7c2 — Hint-assisted answers count as 50% accuracy (not 100%).
// A level that would be "complete" on 4 clean correct answers should NOT
// be complete if all 4 used the hint.
// ──────────────────────────────────────────────────────────────────────────────
{
  const cleanlyComplete = emptyProgress("B");
  cleanlyComplete.levelSessionCounts["B-2"] = COMPLETION_CRITERIA.minSessions;
  // Spread clean-correct results across minSessions distinct sessions so
  // the distinct-session gate is satisfied.
  for (let s = 0; s < COMPLETION_CRITERIA.minSessions; s++) {
    const perSession = Math.ceil(
      COMPLETION_CRITERIA.minGraded / COMPLETION_CRITERIA.minSessions,
    );
    for (let i = 0; i < perSession; i++) {
      cleanlyComplete.recentResults.push({
        levelId: "B-2",
        correct: true,
        ts: `2024-01-0${s + 1}T00:00:0${i}Z`,
      });
    }
  }
  log(
    levelMeetsCompletion(cleanlyComplete, "B-2"),
    "B-2 complete on a full clean-correct window (sanity)",
  );

  // Even with the same number of cards, a single marathon session must not
  // satisfy completion — `minSessions` distinct sessions are required.
  // All cards inside one session share a `ts` (the session's completedAt),
  // so the test uses one timestamp for every result.
  const oneSession = emptyProgress("B");
  oneSession.levelSessionCounts["B-2"] = COMPLETION_CRITERIA.minSessions;
  for (let i = 0; i < COMPLETION_CRITERIA.minGraded + 4; i++) {
    oneSession.recentResults.push({
      levelId: "B-2",
      correct: true,
      ts: "2024-01-01T00:00:00.000Z",
    });
  }
  log(
    !levelMeetsCompletion(oneSession, "B-2"),
    "B-2 NOT complete from a single marathon session (mastery requires distinct sessions)",
  );

  const hintAssisted = emptyProgress("B");
  hintAssisted.levelSessionCounts["B-2"] = COMPLETION_CRITERIA.minSessions;
  for (let s = 0; s < COMPLETION_CRITERIA.minSessions; s++) {
    const perSession = Math.ceil(
      COMPLETION_CRITERIA.minGraded / COMPLETION_CRITERIA.minSessions,
    );
    for (let i = 0; i < perSession; i++) {
      hintAssisted.recentResults.push({
        levelId: "B-2",
        correct: true,
        usedHint: true,
        ts: `2024-01-0${s + 1}T00:00:0${i}Z`,
      });
    }
  }
  log(
    !levelMeetsCompletion(hintAssisted, "B-2"),
    "B-2 NOT complete when every recent result used the hint (50% < 90%)",
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 7d — Movable-major-e-shape pattern: G major resolves to the canonical
// 15-note Position 1 fret layout (root at 6/3, anchor at fret 2).
// ──────────────────────────────────────────────────────────────────────────────
{
  // Inline import keeps the rest of the script free of shape internals.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SHAPES_BY_ID, resolvePatternToSteps } = require(
    "@/lib/curriculum/shapeLibrary",
  ) as typeof import("@/lib/curriculum/shapeLibrary");
  const shape = SHAPES_BY_ID["movable-major-e-shape"]!;
  log(!!shape.pattern, "movable-major-e-shape has a pattern");
  if (shape.pattern) {
    const steps = resolvePatternToSteps(shape.pattern, 7); // G
    const expected = [
      { stringIndex: 5, fret: 3 }, // G
      { stringIndex: 5, fret: 5 }, // A
      { stringIndex: 4, fret: 2 }, // B
      { stringIndex: 4, fret: 3 }, // C
      { stringIndex: 4, fret: 5 }, // D
      { stringIndex: 3, fret: 2 }, // E
      { stringIndex: 3, fret: 4 }, // F#
      { stringIndex: 3, fret: 5 }, // G
      { stringIndex: 2, fret: 2 }, // A
      { stringIndex: 2, fret: 4 }, // B
      { stringIndex: 2, fret: 5 }, // C
      { stringIndex: 1, fret: 3 }, // D
      { stringIndex: 1, fret: 5 }, // E
      { stringIndex: 0, fret: 2 }, // F#
      { stringIndex: 0, fret: 3 }, // G
    ];
    const matches =
      steps.length === expected.length &&
      steps.every(
        (s, i) =>
          s.stringIndex === expected[i]!.stringIndex &&
          s.fret === expected[i]!.fret,
      );
    log(
      matches,
      "G major Position 1: 15 notes at the expected (string,fret) positions",
      `actual=${steps.length} positions`,
    );
    // Spot-check transposition: F major (rootPc 5) should anchor at fret 0.
    const fSteps = resolvePatternToSteps(shape.pattern, 5);
    const fAnchor = fSteps[0]!;
    log(
      fAnchor.stringIndex === 5 && fAnchor.fret === 1,
      "F major Position 1: root lands on 6th string fret 1 (anchor open)",
      `fAnchor=(${fAnchor.stringIndex},${fAnchor.fret})`,
    );
    // Each note carries finger + degree metadata.
    log(
      steps.every((s) => s.finger != null && !!s.degree),
      "every Position 1 step carries finger + degree metadata",
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Test 7e — Pentatonic boxes: each shape exposes a pattern, the resolved
// notes at the default tonic match the canonical fret layout, and every
// step carries finger + degree metadata so the toggle works end-to-end.
// ──────────────────────────────────────────────────────────────────────────────
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SHAPES_BY_ID, resolvePatternToSteps } = require(
    "@/lib/curriculum/shapeLibrary",
  ) as typeof import("@/lib/curriculum/shapeLibrary");

  const pentIds = [
    "pent-box-1",
    "pent-box-1-roots",
    "pent-box-1-chord-tones",
    "pent-box-2",
    "pent-box-2-chord-tones",
    "connect-box-1-2",
  ] as const;

  for (const id of pentIds) {
    const shape = SHAPES_BY_ID[id]!;
    log(!!shape.pattern, `${id} has a pattern`);
    log(
      shape.steps.every((s) => s.finger != null && !!s.degree),
      `${id} steps all carry finger + degree metadata`,
    );
  }

  // Box 1 in A: classic frets across 6 strings.
  const box1 = SHAPES_BY_ID["pent-box-1"]!;
  if (box1.pattern) {
    const steps = resolvePatternToSteps(box1.pattern, 9);
    const expected = [
      [5, 5],
      [5, 8],
      [4, 5],
      [4, 7],
      [3, 5],
      [3, 7],
      [2, 5],
      [2, 7],
      [1, 5],
      [1, 8],
      [0, 5],
      [0, 8],
    ];
    const matches =
      steps.length === expected.length &&
      steps.every(
        (s, i) =>
          s.stringIndex === expected[i]![0] && s.fret === expected[i]![1],
      );
    log(matches, "Box 1 in A: 12 notes at canonical (string,fret) positions");
  }

  // Box 2 in A: corrected frets (D string ends at 10, G string at 7+9).
  const box2 = SHAPES_BY_ID["pent-box-2"]!;
  if (box2.pattern) {
    const steps = resolvePatternToSteps(box2.pattern, 9);
    const expected = [
      [5, 8],
      [5, 10],
      [4, 7],
      [4, 10],
      [3, 7],
      [3, 10],
      [2, 7],
      [2, 9],
      [1, 8],
      [1, 10],
      [0, 8],
      [0, 10],
    ];
    const matches =
      steps.length === expected.length &&
      steps.every(
        (s, i) =>
          s.stringIndex === expected[i]![0] && s.fret === expected[i]![1],
      );
    log(matches, "Box 2 in A: 12 notes at corrected (string,fret) positions");
  }

  // Transposition spot-check: Box 1 in E minor should anchor at fret 0
  // on the low E string (E open).
  if (box1.pattern) {
    const eSteps = resolvePatternToSteps(box1.pattern, 4);
    const first = eSteps[0]!;
    log(
      first.stringIndex === 5 && first.fret === 0,
      "Box 1 transposed to E minor: root lands at 6th string fret 0 (open)",
      `first=(${first.stringIndex},${first.fret})`,
    );
  }
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
