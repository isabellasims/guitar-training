# Tonic (guitar-training)

Personal **guitar theory practice** app. Mobile-first UI, local-only progress (IndexedDB), pitch-aware grading, and PWA install support.

**Curriculum** is defined in code (`lib/curriculum/levels.ts`) and documented in [`public/rules.md`](./public/rules.md). Tracks **A, B, C** start immediately; **D** and **E** enter after **A·11** (full major diatonic); **F** (improvisation) enters after **A·11** and **D·2**.

The field manual [`guitar-practice-plan.html`](./guitar-practice-plan.html) (*Hear It · Find It · Play It*) is background reading — pacing and week labels there are **not** what the app uses for gating.

---

## Feature specification

### Product principles

- **Every card ties to playing.** No abstract flashcards disconnected from the instrument.
- **Drone always available** where pedagogy calls for it.
- **Plain English in the UI** — e.g. “minor third,” not “♭3.”
- **Concept after sound** — audio first, then fretboard, then name.
- **Scale degrees primary**, intervals secondary.
- **Pitch detection** is the default grader ([Pitchy](https://www.npmjs.com/package/pitchy) + Web Audio). Self-rating when detection is off or insufficient.
- **No accounts** — progress on device only.

### Scope

| Area | Status |
|------|--------|
| Next.js 14, TypeScript, Tailwind, PWA | Done |
| Tracks **A–F** (80 levels total) | Done (`levels.ts`, `cardsForLevel.ts`) |
| Session builder + trim + maintenance warmups | Done (`buildSession.ts`) |
| Level completion (2 sessions, 85% / 8-card window, hint penalty) | Done (`completion.ts`) |
| SRS reviews (stable card defs) | Done (`reviewOps.ts`) |
| Fretboard, shapes, CAGED, pentatonic | Done (`shapeLibrary.ts`) |
| Custom flashcards + starred cards | Done (`/flashcards`) |
| Sine drones + synth chords (Tone.js) | Done |
| MP3 drone loops / recorded chord bank | Not yet |

### Card types in use

| Type | Grading |
|------|---------|
| `concept-explainer` | Continue (foundation gate) |
| `drone-degree-play` / `drone-degree-identify` | Pitch / multiple choice |
| `note-finding-play` | Pitch or tap |
| `shape-recall-play` | Pitch sequence |
| `functional-ear-mc` / `chord-change-mc` / `chord-change-identify` | Ear MC |
| `interval-play` / `interval-identify` | Pitch / MC |
| `melodic-dictation` | Pitch sequence |
| `chord-tone-targeting-play` | Pitch classes |
| `drone-listen-warmup` / `freeplay-afterglow` | Not graded |

### Data model (IndexedDB)

- **Settings** — session length, pitch on/off, drone volume, left-handed mirror, etc.
- **TrackProgress** (per track A–F) — `currentNodeId`, `completedNodeIds`, `unlockedNodeIds` (derived from prereqs), `seenExplainerLevelIds`, `levelSessionCounts`, `recentResults`.
- **ReviewItem** — SRS; stable id from template + track + level + parameters.
- **Session** / **Streak** — history and streak.

### Repository layout

```text
app/                     # Routes: home, session, tracks, library, settings, flashcards
components/              # UI, cards, fretboard, audio
lib/
  curriculum/            # levels, cardsForLevel, prerequisites, completion, shapes
  session-builder/       # assembleSession
  db/                    # Dexie
  tracks/tracks.ts       # Track metadata (names, descriptions)
public/rules.md          # Curriculum spec (mirrors levels.ts)
guitar-practice-plan.html
```

### Scripts

```bash
npm run dev          # http://localhost:3000
npm run build        # production + PWA
npm run verify       # curriculum logic tests (rules.md §8)
npm run sync-manual  # copy manual → public/
```

### Pedagogy (sessions)

Each session: **warmup → (maintenance) → reviews → resurfaced skips → track blocks A…F → afterglow**.

Foundation levels always show their explainer once before practice. Run `npm run verify` after curriculum edits.

### Deployment

Vercel on push to `main`. If styles break after deploy, hard-refresh or clear the service worker. Mic needs **HTTPS** or **localhost**.

---

## Development

```bash
npm install
npm run dev
```

Open `/dev/pitch-test` for microphone checks; `/dev/progress` for curriculum debugging.
