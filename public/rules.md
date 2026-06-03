# Tonic — Curriculum Dependencies & Session Composition

This document is the **source of truth** for curriculum logic in the app. It mirrors `lib/curriculum/levels.ts` and `lib/curriculum/prerequisites.ts`. When in doubt, those files win; run `npm run verify` after any change.

---

## 1. Two categories of levels

Every level is either:

- **[F] Foundation** — introduces a new concept. Includes a `concept-explainer` card shown **before practice** (pre-session gate on the Tracks page or at session start), not as a graded card in the session queue.
- **[P] Practice** — drills only; no explainer gate.

---

## 2. Hard prerequisites

A level cannot appear in **any** session (including reviews and warmups) until **every** prerequisite level is **complete**.

### Track A — Scale degrees (22 levels)

| Level | Type | Name | Hard prerequisites |
|-------|------|------|-------------------|
| A·1 | F | Tonic (C major) | — |
| A·2 | F | The Root | A·1 |
| A·3 | F | The 5th | A·2 |
| A·4 | F | The 3rd (major) | A·3 |
| A·5 | P | Stable Tones Consolidation | A·4 |
| A·6 | F | The 7th (leading tone) | A·5 |
| A·7 | F | The 4th | A·6 |
| A·8 | P | Mid-tension Consolidation | A·7 |
| A·9 | F | The 2nd | A·8 |
| A·10 | F | The 6th | A·9 |
| A·11 | P | Full Major Diatonic | A·10 |
| A·12 | F | Tonic (A minor) | A·11 |
| A·13 | P | Re-orient (Root + 5th in minor) | A·12 |
| A·14 | F | The Flat 3rd | A·13 |
| A·15 | F | The Flat 7 | A·14 |
| A·16 | F | The Flat 6 + 2 (in minor) | A·15 |
| A·17 | P | Full Minor Diatonic | A·16 |
| A·18 | P | Cross-mode Consolidation | A·17 |
| A·19 | F | G and D major | A·18 |
| A·20 | P | All Major Keys | A·19 |
| A·21 | F | E and D minor | A·20 |
| A·22 | P | All Keys, All Modes | A·21 |

**Phases:** A·1–11 major diatonic by ear → A·12–18 minor (open A minor shape taught in A·12 explainer) → A·19–22 cross-key.

**Explainer-only levels (no graded practice):** A·1, A·12 — complete after explainer seen + minimum sessions.

### Track B — Note finding (18 levels)

**Phase 1 — one string at a time (low → high):**

| Level | Type | Name | Prerequisites |
|-------|------|------|---------------|
| B·1 | F | Low E String | — |
| B·2 | F | A String | B·1 |
| B·3 | P | E + A Mix | B·2 |
| B·4 | F | D String | B·3 |
| B·5 | P | G String | B·4 |
| B·6 | F | B String (2nd) | B·5 |
| B·7 | P | High E String | B·6 |

**Phase 2 — one note class, all strings** (circle of fifths: C → G → D → A → E → F → B):

| Level | Type | Name | Prerequisites |
|-------|------|------|---------------|
| B·8 | F | C Note — All Strings | B·7 |
| B·9 | P | G Note — All Strings | B·8 |
| B·10 | P | D Note — All Strings | B·9 |
| B·11 | P | A Note — All Strings | B·10 |
| B·12 | P | E Note — All Strings | B·11 |
| B·13 | P | F Note — All Strings | B·12 |
| B·14 | P | B Note — All Strings | B·13 |

**Phase 3 — full neck:**

| Level | Type | Name | Prerequisites |
|-------|------|------|---------------|
| B·15 | F | Sharps and Flats | B·14 |
| B·16 | P | Mixed Naturals | B·15 |
| B·17 | P | Mixed Chromatic | B·16 |
| B·18 | P | Speed (Under 2s) | B·17 |

No cross-track prerequisites. Existing saves remap old B·2…B·13 completions to the new ids on first load.

### Track C — Fretboard & CAGED (14 levels)

| Level | Type | Name | Prerequisites |
|-------|------|------|---------------|
| C·1 | F | Open C Major Scale | — |
| C·2 | F | Open A Minor Scale | C·1 |
| C·3 | F | Movable Major Scale (E-shape) | C·2 |
| C·4 | F | Movable Minor Scale (E-shape) | C·3 |
| C·5 | F | Minor Pentatonic Box 1 | C·4 |
| C·6 | F | Box 1 — Roots | C·5 |
| C·7 | F | Box 1 — All Chord Tones | C·6, **A·4** |
| C·8 | F | E-shape CAGED — Major Chord Tones | C·7 |
| C·9 | F | E-shape CAGED — Minor Chord Tones | C·8 |
| C·10 | F | Minor Pentatonic Box 2 | C·9 |
| C·11 | F | Box 2 — Chord Tones | C·10 |
| C·12 | F | A-shape CAGED — Chord Tones | C·11 |
| C·13 | F | Major Scale Around A-shape | C·12 |
| C·14 | P | Connect Box 1 + Box 2 | C·13 |

**Cross-track:** C·7 requires **A·4** (user knows 3rd/5th names).

### Track D — Hearing chord changes (5 levels)

| Level | Type | Name | Prerequisites |
|-------|------|------|---------------|
| D·1 | F | I-IV-V Recognition | **A·11** |
| D·2 | F | The vi Chord | D·1 |
| D·3 | F | The ii Chord | D·2 |
| D·4 | F | Minor Key Changes | D·3 |
| D·5 | P | Real Songs | D·4 |

**Track entry:** first card from D only after **A·11** is complete.

### Track E — Intervals (17 levels)

| Level | Type | Name | Prerequisites |
|-------|------|------|---------------|
| E·1 | F | Perfect 5th | **A·5** |
| E·2 | F | Perfect 4th | E·1 |
| … | … | … | … |
| E·17 | P | Mixed Direction Consolidation | E·16 |

**Track entry:** after **A·5** (stable major tones) — parallel with degree work, not after A·11.

### Track F — Improvisation (4 levels)

| Level | Type | Name | Prerequisites |
|-------|------|------|---------------|
| F·1 | F | Major chord tones (1, 3, 5) | **A·11**, **D·2** |
| F·2 | F | Minor chord tones (1, b3, 5) | F·1 |
| F·3 | P | Chord tone vs. non-chord-tone | F·2 |
| F·4 | P | Freeplay capstone | F·3 |

**Track entry:** after **A·11** and **D·2** (vi chord by ear).

---

## 3. Cross-track diagram

```text
A·1 → … → A·5 ─────────────→ E·1…E·17 (intervals)
         … → A·11 ─┬→ D·1…D·5 (chord changes)
                   └→ (with D·2) F·1…F·4 (improv)

C·7 ← needs A·4 (3rd)
```

---

## 4. Track entry conditions

| Track | When cards can appear |
|-------|------------------------|
| A, B, C | Day one |
| E | **A·5** complete |
| D | **A·11** complete |
| F | **A·11** and **D·2** complete |

---

## 5. Session composition (practice pacer)

Built in `lib/session-builder/buildSession.ts`. **Practice sessions** are forward-looking: current-level work only.

**Order:**

1. **Resurfaced** (optional) — up to **3** cards skipped last session (rest stay queued).
2. **Per-track blocks** — **A** first, **F** last when present; **B/C/D/E** shuffled in the middle: optional **track intro** → **practice cards** (counts scale with session length: 5 / 15 / 30 minutes).
3. **Reviews** — **not** included by default. Use **Review queue** (`/reviews`) for SRS.

**Not in practice sessions:** drone-listen warmup, maintenance reps from old levels, in-session foundation explainers (pre-session gate instead), freeplay afterglow (session complete screen instead).

**Trim** (if over target × 1.2): drop optional reviews → trim extra practice cards from F→A. Resurfaced capped at 3 at build time.

**Preflight:** session start shows estimated time and card count before **Start**.

---

## 6. Level completion

From `lib/curriculum/completion.ts`:

| Rule | Value |
|------|--------|
| Minimum sessions level appeared in | **2** |
| Minimum graded cards in rolling window | **8** |
| Accuracy window size | **8** |
| Required accuracy (weighted) | **85%** |
| Hint-assisted correct | **50%** credit |
| Distinct sessions in window | Must be **≥ 2** |

Level-up UI runs **at session end**. **Bypass** available on Tracks for test-out.

---

## 7. Content rules (card authoring)

- **Identify** cards never use the tonic as an answer option (drone = home).
- **Recognition prompts** for a level are **deterministic** (seeded per level in `cardsForLevel.ts`) so SRS rows stay stable.
- Card copy lives in `lib/curriculum/cardsForLevel.ts`; level metadata in `lib/curriculum/levels.ts`.

---

## 8. Verification checklist (`npm run verify`)

- [x] New user: practice cards for A/B/C; no D before A·11; no E before A·5; no F before gates.
- [x] No warmup / afterglow / in-session explainers in practice assembly.
- [x] A·12 unlocks after A·11 without C·2.
- [x] Hint-only accuracy cannot complete a level.
- [x] All prerequisite IDs resolve.

---

## 9. Explicit non-goals

- Calendar-based “week N” unlocking.
- Server-side progress (local Dexie only).

Optional later: expand Track F improv levels; compress Track B; MP3 drone loops.
