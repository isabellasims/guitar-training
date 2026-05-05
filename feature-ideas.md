# fretboard
- option to select a note and it displays at every place on the board, then shows the tabs for that note on every string

problems: For the note finding, when you hear the right pitch it should say "Nice! Heard the right pitch. And then automatically present the next one. Also, you should only need to allow the mic once in the beginning of the lesson. Also this a minor one octave fragment is introduced completely without context. it would fit better like: If it's the introduction to the A natural minor shape (Track C, Level 1), the card should look more like:

Concept card — A natural minor, one octave
This is the shape you'll need for minor-key drone work. Same notes as C major, but starting on A.
[Fretboard image with all 8 notes highlighted]
Listen: [audio plays the full scale ascending]
Now play it yourself, ascending. Pitch detection will verify the sequence.Or learning it in chunks is fine.But making you play each on a seperate card before you continue doesn't make sense you need to be allowed to play all at once. It would be better to even show the fret board and highlight each note as you play it and you would need to know the a minor shape



Addendum: Replace Weeks with Levels
Why this change
The original plan used week numbers as the user's progression marker. This creates artificial pressure and doesn't reflect how the app actually works — progression is gated by mastery (completion criteria per node), not by calendar time elapsed. Some users move faster, some slower. The week framing implies a calendar that doesn't exist.
The fix: each track is structured as named levels. The user advances when they meet the completion criteria for the current level, not when seven days pass.
The original 16-week plan remains useful as a pace estimate in static documentation, but the app's UI must never display "Week N" as the user's current state. Always "Level N · [Concept Name]."
Naming convention
Every level has both a number and a name. The number gives orientation; the name carries the meaning.
Display format throughout the app:
Track A · Level 7 · The 7th
Track B · Level 4 · Add F
Track C · Level 3 · Pentatonic Box 1
Track D · Level 2 · I-IV-V Recognition
Track E · Level 1 · Major 2nd
When space is constrained (e.g., session card headers), abbreviate to:
A·7 · The 7th
B·4 · Add F
Full level list per track
Track A — Scale Degrees (16 levels)

Tonic (C major)
Tonic (A minor)
The Root
The 5th
The 3rd
Stable Tones (minor)
The 7th
The 4th
The 2nd
The 6th
Chord Tones Only
Add the Flat 7
Pentatonic with Targets
Two-Chord Vamp
Real Progression
Mixed-Key Recognition

Track B — Note Finding (10 levels)

E String
E + A Random


C Across Strings




F




G




D and A




B and F♯


Full Chromatic
Full Fretboard Recall
Speed (Under 2s)

Track C — Fretboard & CAGED (12 levels)

A Natural Minor (1 Octave)
A Natural Minor Solid
Pentatonic Box 1
Box 1 — Roots
Box 1 — All Chord Tones
E-Shape CAGED (Major)
E-Shape CAGED (Minor)
Pentatonic Box 2
Box 2 — Chord Tones
A-Shape CAGED
Connect Box 1 + 2
D-Shape + Third Box

Track D — Hearing Chord Changes (6 levels)

I-IV-V on Guitar (you play)
I-IV-V Recognition (you listen)


The vi Chord


Real Progressions (Major)
Minor Key Changes
Real Songs

Track E — Intervals (10 levels)

Major 2nd (2 frets)
Major 3rd (4 frets)
Perfect 4th (5 frets)
Minor 3rd (3 frets)
Perfect 5th (7 frets)
Minor 7th (10 frets)
All Above — Descending
All Above — Cross-String
Hum-Then-Find
Sung Melody to Fretboard

Completion criteria
Each level is "complete" when the user hits both:

Minimum sessions: at least 3 sessions where the level appeared in the session
Accuracy threshold: 80% correct across the most recent 10 cards drawn from the level

Once both conditions are met, the next level unlocks automatically. The user sees a brief "Level N complete · Next: [concept]" screen, with a single tap to continue.
These thresholds should be configurable in the codebase (not hardcoded) so they can be tuned during dogfooding.
Data model implications
typescripttype Node = {
  id: string;             // e.g., "A-7"
  trackId: 'A' | 'B' | 'C' | 'D' | 'E';
  level: number;          // ordinal, 1-indexed
  name: string;           // "The 7th"
  prerequisiteNodeIds: string[];
  cardTemplates: CardTemplate[];
  completionCriteria: {
    minSessions: number;  // default 3
    minAccuracy: number;  // default 0.8
    accuracyWindow: number; // default 10 cards
  };
};

type TrackProgress = {
  trackId: string;
  currentLevel: number;
  currentNodeId: string;
  unlockedLevels: number[];
  completedLevels: number[];
  // For accuracy tracking on the current level:
  recentResults: Array<{ cardId: string; correct: boolean; timestamp: Date }>;
};
Note: currentLevel and currentNodeId are redundant but both exist for convenience. The agent can pick one as canonical.
UI implications
Where levels appear

Home screen. A compact summary per track:

   Track A · Level 7 · The 7th        ▓▓▓▓░░░░  4/5 sessions
   Track B · Level 4 · Add F          ▓▓▓▓▓▓░░  Accuracy 78%

Tracks screen (skill tree). Each node displays its level number and name. Locked nodes are dimmed but still readable. Tap any node to see its concept and required prerequisites.
Session screen. Each card's header shows the level it's drawn from:

   [Card content]
   ──────────────
   A·7 · The 7th
This is small, secondary text — orienting, not dominant.

Level-up screen. When completion criteria are met:

   Level 7 complete.
   The 7th
   
   Next: Level 8 · The 4th
   [Continue]
Where week numbers should not appear

Never in the home screen
Never in the session UI
Never in error messages or empty states
Never as labels on locked content ("Unlocks in Week 6") — instead use prerequisites ("Unlocks after Track A Level 5")

Where week numbers may appear

In an optional "About this plan" or "Pace guide" reference page, where the original 16-week timeline is shown as a static reference for users curious about expected duration. Frame it as: "At a steady pace of 5 sessions/week, most users complete the spine tracks in 16–20 weeks. You may go faster or slower — the app paces itself to your mastery, not to a calendar."

Pace messaging
The app should occasionally surface pace context, but always framed as orientation rather than judgment:

After level-up: "You're moving at a strong pace." or "This level took 4 sessions — typical is 3–6."
On the home screen weekly summary: "5 sessions this week. Track A advanced 1 level."
Never: "You're behind." "You should be on Level X by now." "Hurry up."

The user's only deadline is their own goal. The app respects that.
What stays week-based
The 16-week practice plan document (guitar-practice-plan.html) keeps its week-based framing because it's a static reference document, not the live app. It functions as the curriculum source-of-truth and pace estimate. The app implements that curriculum in level form.
When updating the practice plan document for consistency, add a single sidebar note near the top:

Note: The app implements this plan as named levels rather than weeks. The week numbers here are a pace estimate at a steady 5-sessions-per-week tempo. The app advances by mastery, not calendar.

That's the only change needed in the practice plan document itself.

Hand this addendum to the agent alongside the build spec. The agent should treat the level naming as authoritative — it overrides any week-based framing that appears in the rest of the spec.