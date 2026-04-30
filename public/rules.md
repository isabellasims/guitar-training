Here's the explicit dependency map and session-building rules. Hand this to the agent as a hard spec.

Tonic — Curriculum Dependencies & Session Composition
This document specifies exactly what blocks what, in what order new content is introduced, and how each daily session is composed. The agent must implement this spec literally. Where the build spec or addendum is silent, this document is the source of truth for curriculum logic.

1. Two Categories of Levels
Every level in every track is one of two types:
Foundation levels introduce a new concept. They contain at least one concept-explainer card before any practice cards. The user must see the concept-explainer card on their first encounter with this level. Foundation levels cannot be skipped, even if the user already knows the concept.
Practice levels drill an established concept. They contain only practice cards (no explainers). Practice levels can be advanced through quickly if the user is already skilled.
Each level in the level lists below is tagged [F] for Foundation or [P] for Practice.

2. Hard Prerequisites — What Blocks What
A "hard prerequisite" means: the dependent level CANNOT appear in any session — including reviews, including warmups, including any card type whatsoever — until the prerequisite level is marked complete.
Track A — Scale Degrees
LevelTypeNameHard PrerequisitesA·1FTonic (C major)noneA·2FTonic (A minor)A·1, C·2A·3FThe RootA·2A·4FThe 5thA·3A·5FThe 3rdA·4A·6PStable Tones (minor)A·5A·7FThe 7thA·6A·8FThe 4thA·7A·9FThe 2ndA·8A·10FThe 6thA·9A·11FChord Tones OnlyA·10A·12FAdd the Flat 7A·11A·13PPentatonic with TargetsA·12, C·5A·14PTwo-Chord VampA·13A·15PReal ProgressionA·14, D·3A·16PMixed-Key RecognitionA·15
Note A·2 → C·2: Track A Level 2 introduces minor-key drone work. The user needs the A natural minor shape (Track C Level 2) physically under their fingers before this level can run. This is a cross-track dependency.
Note A·13 → C·5: Pentatonic chord-tone targeting requires the user to have learned Pentatonic Box 1 with all chord tones identified.
Note A·15 → D·3: "Real Progression" soloing requires the user to be able to hear chord changes (vi added to I-IV-V).
Track B — Note Finding
LevelTypeNameHard PrerequisitesB·1FE StringnoneB·2PE + A RandomB·1B·3F+ C Across StringsB·2B·4P+ FB·3B·5P+ GB·4B·6P+ D and AB·5B·7P+ B and F♯B·6B·8PFull ChromaticB·7B·9PFull Fretboard RecallB·8B·10PSpeed (Under 2s)B·9
Track B is fully self-contained. No cross-track dependencies.
Track C — Fretboard & CAGED
LevelTypeNameHard PrerequisitesC·1FA Natural Minor (1 Octave)noneC·2PA Natural Minor SolidC·1C·3FPentatonic Box 1C·2C·4FBox 1 — RootsC·3C·5FBox 1 — All Chord TonesC·4, A·5C·6FE-Shape CAGED (Major)C·5C·7FE-Shape CAGED (Minor)C·6C·8FPentatonic Box 2C·7C·9FBox 2 — Chord TonesC·8C·10FA-Shape CAGEDC·9C·11PConnect Box 1 + 2C·10C·12FD-Shape + Third BoxC·11
Note C·5 → A·5: Identifying all chord tones in the box requires the user to have learned the root, 5th, and 3rd as scale degrees first. The labels ("this is the 3rd," "this is the b3") only make sense once the user knows what those degrees mean.
Track D — Hearing Chord Changes
LevelTypeNameHard PrerequisitesD·1FI-IV-V on Guitar (you play)A·5D·2FI-IV-V Recognition (you listen)D·1D·3F+ The vi ChordD·2D·4PReal Progressions (Major)D·3D·5FMinor Key ChangesD·4D·6PReal SongsD·5
Note D·1 → A·5: The user needs to understand that I, IV, V are functional roles relative to a tonic before learning to play or hear them. That requires the basic stable tones (1, 5, 3) to be in place.
Track E — Intervals
LevelTypeNameHard PrerequisitesE·1FMajor 2nd (2 frets)noneE·2FMajor 3rd (4 frets)E·1E·3FPerfect 4th (5 frets)E·2E·4FMinor 3rd (3 frets)E·3E·5FPerfect 5th (7 frets)E·4E·6FMinor 7th (10 frets)E·5E·7PAll Above — DescendingE·6E·8PAll Above — Cross-StringE·7E·9FHum-Then-FindE·8E·10PSung Melody to FretboardE·9
Track E is fully self-contained for V1. No cross-track dependencies.

3. Cross-Track Dependency Diagram
For the agent to visualize the gating: a few specific cross-track edges exist.
A·1 (Tonic C major)
   ↓
A·2 (Tonic A minor) ←── C·2 (A natural minor solid)
   ↓
A·3 (Root) → A·4 (5th) → A·5 (3rd)
                              ↓ ↓
                              ↓ ↓──────→ D·1 (I-IV-V on guitar)
                              ↓                ↓
                              ↓             D·2, D·3
                              ↓                ↓
                              ↓             D·3 ───→ A·15 (Real Progression)
                              ↓
                              ↓──────→ C·5 (Box 1 chord tones)
                                              ↓
                                          C·5 ───→ A·13 (Pentatonic with Targets)
All other levels within a track depend only on the previous level in their own track.

4. Track Entry Conditions
A track is "entered" the first time the user can receive a card from it. Until a track is entered, no card from that track appears in any session.
TrackEntry ConditionADay 1 — entered immediately on first sessionBDay 1 — entered immediately on first sessionCDay 1 — entered immediately on first session (because A·2 requires C·2, and A is on day 1)DEntered when A·5 is complete (no earlier — there's no concept of "the I chord" before the user has learned the root, 5th, and 3rd)EEntered when A·5 is complete (intervals as a parallel track make more sense once basic scale-degree thinking has begun; before that, intervals risk reinforcing distance-from-last-note thinking the plan wants to avoid)
Important for the agent: Track E does NOT enter on day 1 even though it has no internal prerequisites. The plan's pedagogical intent is that scale-degree thinking is established as the primary lens before intervals are introduced as the secondary lens. This is a curriculum decision, not a technical one. Hold Tracks D and E until A·5 is complete.

5. Daily Session Composition Algorithm
The session builder runs once when the user taps "Start Session." It builds a list of cards and that list is fixed for the duration of that session. The user can swipe back to revisit cards but cannot skip past them.
Step 1 — Determine session length
Read settings.targetSessionMinutes. Default 30. Use this as the soft cap for total session duration.
Estimate per-card durations:

Concept-explainer card: 90 seconds
Note-finding tap card: 30 seconds
Drone-degree card: 90 seconds
Functional ear MC card: 45 seconds
Shape recall card: 120 seconds
Chord-tone targeting card: 120 seconds
Chord-change MC card: 60 seconds
Interval card: 60 seconds
Freeplay/afterglow: 90 seconds

These are estimates. The session can run over by ±20%.
Step 2 — Build the card list in this exact order
Slot 1: Warmup (always)

If the user has at least one due review item, pick the highest-priority review and place it here.
Otherwise, place a "drone listen" warmup card in the user's current Track A key (30 seconds of just listening).

Slot 2: Foundation gates (priority order)
Check each track in this order: A, C, B, D, E. For each track, if the user's current level is a Foundation level [F] and they haven't yet seen the concept-explainer card for it, insert that explainer card now. Multiple explainer cards can stack here if multiple tracks just hit a new Foundation level.
This slot ensures the user always meets new concepts BEFORE drilling on them. It's the single most important rule in this document.
Slot 3: Track A current level (1–3 cards)
Pull cards from the user's current Track A level. Mix card types: include at least one production card (user plays) and one recognition card (user identifies) if both card types exist for this level. Cap at 3 cards.
Slot 4: Track B current level (1–2 cards)
Pull cards from the user's current Track B level. Note-finding cards are quick — 1-2 fits comfortably.
Slot 5: Track C current level (1–2 cards)
Pull cards from the user's current Track C level. Shape-recall and chord-tone-targeting cards are slower — 1-2 is enough.
Slot 6: Track D current level (1–2 cards, if Track D is entered)
If Track D has been entered (A·5 complete), pull 1–2 cards from the user's current Track D level. If not, skip this slot.
Slot 7: Track E current level (1–2 cards, if Track E is entered)
If Track E has been entered (A·5 complete), pull 1–2 cards from the user's current Track E level. If not, skip this slot.
Slot 8: Additional reviews (fill remaining time)
Pull due review items, prioritized by overdue-ness. Fill the session up to the target length. Cap at 5 review cards total per session (to avoid the session becoming all reviews).
Slot 9: Afterglow (always last)
A freeplay card. Backing track in the user's current Track A key, or just a drone if they haven't reached A·11 yet. 90 seconds. Not graded. Just play.
Step 3 — Trim to fit session length
Sum the estimated durations. If over the target by more than 20%, drop cards in this priority order:

Drop reviews from Slot 8 (one at a time, lowest-priority review first)
Drop the second card from Slot 6 or 7 (D or E) if those slots have 2 cards
Drop the second card from Slot 5 (C) if it has 2 cards
Drop the second card from Slot 4 (B) if it has 2 cards
Drop the third card from Slot 3 (A) if it has 3 cards

Never drop:

The warmup (Slot 1)
Foundation gate cards (Slot 2) — these MUST appear if a new concept has been hit
The first card of each track's current-level slot
The afterglow (Slot 9)

If even after all trimming the session still exceeds the target, accept it. Foundation gating is more important than session length.
Step 4 — Render
Pass the assembled card list to the session UI. The user proceeds through cards one at a time.

6. Level Completion & Advancement
A level is marked complete when BOTH conditions are met:

The level has appeared in at least minSessions sessions (default: 3)
The user has scored at least minAccuracy (default: 80%) on the most recent accuracyWindow cards drawn from that level (default: 10)

When both conditions are met, the level transitions to "complete" state. The next level in that track unlocks. The user sees a level-up screen at the END of the session in which completion happened (not mid-session).
If a level requires a cross-track prerequisite that hasn't been met, the level does not unlock even if the in-track prerequisite is complete. The user sees that level as "blocked" in the Tracks view, with hover/tap text explaining the blocking dependency: "Unlocks after Track C Level 2."

7. Adding Things Each Day — The Specific Daily Logic
This section answers the question "how does the app add new content each day?" explicitly.
There is no calendar-based content addition. The app does not check what day it is. Content advances through level completion only.
The daily session changes from day to day for these reasons:
A. Levels advance. When the user completes a level, the next session draws from the new level. This is the only mechanism by which "new content" appears.
B. Foundation gates trigger. When advancing to a new Foundation level, the next session inserts the concept-explainer card for that level in Slot 2. The user always meets new concepts before drilling on them.
C. Cards within a level are randomized. Even if the user's current level is the same as yesterday, the specific cards drawn from that level vary. A level has, say, 12 card templates; each session pulls 1–3 of them. The user sees different cards on different days while drilling the same concept.
D. Reviews change. Yesterday's items are due tomorrow if the user got them wrong, or in 3 days if right, or in 7 days if right twice. So the review queue is constantly shifting, even with no level advancement.
E. Tracks enter. When a track's entry condition is met (e.g., A·5 complete unlocks Tracks D and E), the next session begins including cards from those tracks. This is a one-time event per track but it materially changes the session.
The agent must NOT:

Add content based on day number, week number, or session count
Pre-schedule lessons for "Day 1," "Day 2," etc.
Force advancement when the user hasn't met completion criteria
Skip Foundation levels or their concept-explainer cards even if the user appears to know the concept

The agent MUST:

Run the session-builder algorithm fresh on every session start
Respect all prerequisites strictly
Always deliver concept-explainer cards before practice cards for any new Foundation level
Honor the entry conditions for Tracks D and E


8. Concept-Explainer Card Requirements
Every Foundation level has at least one concept-explainer card. This card must include:

A clear concept statement — one sentence in plain English saying what the user is about to learn
At least one audio example — the sound of the concept in question
A definition or two — terms in plain English, no jargon shorthand
An optional fretboard image — if the concept has a fretboard component, it's shown
No grading — the user taps "Got it" or "Continue" to advance. There is no test.

Concept-explainer cards are stored in content/tracks/[track]/[level]-explainer.mdx (or equivalent). They are versioned as content, not generated dynamically.
The first time a user encounters a Foundation level in a session, they MUST see the explainer card before any practice card from that level. Subsequent sessions do not re-show the explainer (unless the user explicitly taps "review concept" from the level detail page).

9. What the Agent Must Verify Before Considering the System Working
Before declaring the curriculum logic complete, the agent must verify all of the following with explicit tests:

☐ A new user (no progress) running their first session sees: warmup, A·1 explainer, A·1 practice cards, B·1 explainer, B·1 practice cards, C·1 explainer, C·1 practice cards, afterglow. NO Track D or E cards. NO references to chord tones, intervals, or scale degrees beyond the tonic.
☐ The system rejects any attempt to surface a card from a level whose prerequisites are not met. E.g., a card from A·11 cannot appear before A·10 is complete, regardless of session-builder logic.
☐ The system rejects any attempt to surface a Track D card before A·5 is complete.
☐ A Foundation level cannot have its practice cards delivered before its concept-explainer card has been shown to the user at least once.
☐ Cross-track dependencies are enforced: A·2 cannot complete (and therefore A·3 cannot unlock) until C·2 is also complete.
☐ When a level's completion criteria are met mid-session, the level-up screen appears at session end, not mid-session.
☐ Reviews never violate prerequisites — if a card is in the review queue from a level that's been "rolled back" somehow, that review card is skipped silently.
☐ Trimming a session for length never drops a Foundation gate card or a warmup or an afterglow.

If any of these fail, the curriculum logic is incomplete. Fix before shipping.

End of curriculum spec.

That's everything. Pair this with the build spec and the level-naming addendum. Together they should give the agent unambiguous instructions on what to build, what blocks what, and how each session is composed.
A note on what's deliberately NOT in this spec: anything about UI styling, audio file generation, or backend infrastructure. Those are covered elsewhere. This document is curriculum logic only.

