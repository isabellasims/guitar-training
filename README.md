# Tonic (guitar-training)

Personal **guitar theory practice** app aligned with the written manual [`guitar-practice-plan.html`](./guitar-practice-plan.html) (*Hear It · Find It · Play It*). This repo is the Next.js implementation: mobile-first UI, local-only data, pitch-aware grading, and PWA install support.

**Tracks E and F** (hero solo harness, song vocabulary) are **out of scope for now**. The app targets **tracks A–D** first; the manual remains the pedagogical source of truth for full content.

---

## Feature specification

### Product principles

- **Every card ties to playing.** No abstract flashcards disconnected from the instrument.
- **Drone always available** where the pedagogy calls for it. Tonic recognition is the foundation.
- **Plain English in the UI** — e.g. “minor third,” not “♭3.”
- **Concept after sound** — audio first, then fretboard, then name.
- **Scale degrees primary**, intervals secondary in copy and structure.
- **Pitch detection is the default grader** for “play this” cards ([Pitchy](https://www.npmjs.com/package/pitchy) + Web Audio). **Self-rating** is reserved for cases where pitch is insufficient (e.g. phrasing/bends) or when the user disables detection in settings (noisy room).
- **No accounts.** The app opens to the home screen; progress lives on the device.

### Scope (this build)

| Area | Status in repo |
|------|----------------|
| Next.js 14 App Router, TypeScript strict, Tailwind, Radix-based UI primitives | Done |
| IndexedDB via Dexie (`lib/db`) | Done (schema + settings/streak seed) |
| Zustand settings store | Done |
| PWA (`@ducanh2912/next-pwa`, `app/manifest.ts`) | Done (service worker in production build) |
| Field-manual visual language (paper/ink/rust tokens) | Done |
| Shell routes: Home, Session, Tracks, Library, Settings | Done |
| Pitch lab (`/dev/pitch-test`) | Done (mic + Pitchy, ±25 cents, 200ms delay, 3s window) |
| Library sine drone stub (Tone.js) | Done (pre-rendered drone MP3s later) |
| Drone ducking while pitch mic listens (~80% reduction) | Done (`lib/audio/drone.ts` + `PitchMicPanel`) |
| Single-note reference playback (Tone synth) | Done (`lib/audio/referenceNote.ts`, Library demo) |
| Fretboard SVG (`components/fretboard`, `/dev/fretboard`) | Done (Phase 2 baseline: tap, labels, highlights, left-handed mirror) |
| Track A nodes (manual-aligned) + session runner + streak | Done (Phase 3 baseline) |
| Track B & C nodes (manual-aligned) + note / shape / chord-tone cards | Done (Phase 4 baseline in `lib/tracks/trackB.ts`, `trackC.ts`, session sampler) |
| Card types + SRS scheduling | Baseline (due queue + SM-2–style intervals in `lib/db/reviewOps.ts`; stable id per card def) |
| Track D nodes + `chord-change-mc` in sessions | Done (`lib/tracks/trackD.ts`, sampler deck — theory MC; no audio bank yet) |
| Track D / Library chord audio bank | Not yet (quizzes + key drone only) |
| Tracks E & F (loops, annotations, your MP3s) | **Deferred** |

### Screens (target UX)

1. **Home** — Today’s session preview, primary **Start** CTA, streak, optional last-7-days calendar, link to manual, **“5 minutes today”** drop-day session (stub query `?quick=1` on Session).
2. **Session** — Full-screen card flow; **drone toggle**; **mic indicator** when listening; drone ducking (~80% volume reduction during listen windows) when wired.
3. **Tracks** — Four paths (A–D), node lists, progression state (unlocked/completed) backed by IndexedDB.
4. **Library** — Drone player (any key/mode), future reference shapes, song/free-play areas; manual link.
5. **Settings** — Session length targets, days/week, pitch on/off, drone volume, left-handed mirror (fretboard respects this).

### Card types (planned)

| Type | Grading |
|------|---------|
| `note-finding-play` | Pitch: play the requested note. |
| `drone-degree-play` | Pitch: play a scale degree over a droning key. |
| `functional-ear-mc` | Multiple choice (ear only, no playing). |
| `shape-recall-play` | Pitch: sequence of notes in tempo window, in order. |
| `chord-tone-targeting-play` | Pitch: each note must be a chord tone. |
| `chord-change-mc` | Multiple choice on chord function (Track D). |
| `concept-explainer` | Acknowledgment only, no grade. |

**Pitch implementation notes (target):** listen window 200ms after prompt, up to ~3s capture, **±25 cents** tolerance, **drone duck** while listening, mic permission on first need with clear copy.

### Data model (local-only)

Stored in **IndexedDB** (Dexie). No user IDs.

- **Settings** — `targetSessionMinutes`, `daysPerWeek`, `reminderTime`, `droneVolume`, `droneInstrument`, `pitchDetectionEnabled`, `leftHanded`.
- **TrackProgress** (per track) — `currentNodeId`, `unlockedNodeIds`, `completedNodeIds`.
- **ReviewItem** — SRS fields: `easeFactor`, `intervalDays`, `dueDate`, counts, plus `cardTemplateId`, `trackId`, `nodeId`, `parameters`. Rows are keyed by a stable hash of template + track + node + parameters so repeat practice updates the same item.
- **Session** — `startedAt`, `completedAt`, list of **SessionCard** attempts.
- **Streak** — `currentStreak`, `longestStreak`, `lastSessionDate`.

Optional later: **export/import JSON** for a second device (no backend required).

### Audio system (target)

- **Drones:** 24 pre-rendered loops (12 keys × major/minor), served from `public/audio/`.
- **Single notes:** reference playback via Tone.js or MP3s.
- **Track D:** chord progression audio bank (~150 assets) — TBD.

### Repository layout

```text
app/                  # Routes: home, session, tracks, library, settings, manifest
components/           # UI, layout, audio, fretboard, providers
lib/
  fretboard/          # Tuning + MIDI helpers for neck positions
  audio/              # note utils, drone, reference note
  db/                 # Dexie + bootstrap
  domain/             # Shared types
  store/              # Zustand
  tracks/             # Track A–D definitions (expand from manual)
public/
  audio/              # (add drone MP3s later)
  guitar-practice-plan.html  # copied from repo root on dev/build (see scripts)
guitar-practice-plan.html    # Canonical manual in git; copied to public for static hosting
```

### Scripts

- **`npm run sync-manual`** — Copies `guitar-practice-plan.html` → `public/guitar-practice-plan.html` (runs automatically before `dev` and `build` via `predev` / `prebuild`).
- **`npm run dev`** — Local development ([http://localhost:3000](http://localhost:3000)).
- **`npm run build`** — Production build + PWA service worker output under `public/` (generated files are gitignored where applicable).

### Build phases (roadmap)

1. **Phase 0 — Setup** — Next.js, PWA, Dexie, shells, design tokens. **Done.**
2. **Phase 1 — Audio** — Pitch detection, drone (sine → MP3s later), **drone ducking**, **reference-note playback**. **Done** (MP3 asset generation still optional).
3. **Phase 2 — Fretboard** — SVG neck, highlights, optional note labels, tap, inlays, left-handed mirror. **Done (baseline).**
4. **Phase 3 — Track A** — Nodes from manual, first card types, session builder, streak. **Done (baseline).**
5. **Phase 4 — Tracks B & C** — Note-finding, shape recall, chord-tone cards, SRS queue. **Baseline done.**
6. **Phase 5 — Track D** — `chord-change-mc`, manual nodes, Library key drone. **Baseline done** (recorded chord bank still TBD).

### Deployment

- **Vercel** + GitHub: push to `main` to deploy.

**If the UI suddenly looks unstyled (plain HTML):** the service worker may be serving an old document or stylesheet. Do a hard refresh, or in DevTools → Application → **Unregister** the service worker and **Clear site data**, then reload. Production builds use **NetworkFirst** for HTML/CSS caches to reduce this after deploys.
- **PWA:** Add to Home Screen from Safari/Chrome; iOS has storage and mic quirks — test early.
- **Pitch lab** requires **localhost** or **HTTPS** for `getUserMedia`.

### Explicit non-goals

- Authentication, multi-user data, server database for progress.
- Gamification beyond a **streak** (when implemented).
- Jargon shorthand in user-facing strings.
- Static-only “courses” — sessions should be **composed dynamically** from tracks + SRS.
- Licensing-sensitive **public** hero-solo / song libraries (personal E/F deferred).

---

## Development

Requirements: Node 18+, npm.

```bash
npm install
npm run dev
```

Open `/dev/pitch-test` to verify microphone pitch detection.

---

## Pedagogy reference

All copy and node sequencing should eventually match **`guitar-practice-plan.html`**. Until track data is fully transcribed into `lib/tracks/tracks.ts`, the manual is authoritative.
