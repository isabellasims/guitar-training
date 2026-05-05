import type {
  BuiltCard,
  CardTemplateId,
  CardTemplateParams,
  KeyContext,
} from "@/lib/cards/types";
import type { TrackId } from "@/lib/domain/types";
import { SHAPES_BY_ID } from "@/lib/curriculum/shapeLibrary";

/**
 * Curriculum content. Authored verbatim from the project content spec.
 *
 * Two helpers per level:
 *   - explainerForLevel(levelId): the concept-explainer card (or null for [P]).
 *   - practiceCardsForLevel(levelId): the graded practice cards.
 *
 * Recognition cards (drone-degree-identify, chord-change-identify, interval-identify)
 * are pre-baked into deterministic prompt sequences at build time so retries replay
 * the same prompts. Random pools (e.g. 50/50 tonic vs not-tonic) are sampled here.
 */

const C_MAJOR: KeyContext = { tonicMidi: 60, keyLabel: "C major", mode: "major" };
const A_MINOR: KeyContext = { tonicMidi: 57, keyLabel: "A minor", mode: "minor" };
const C_MINOR_LABEL: KeyContext = {
  tonicMidi: 60,
  keyLabel: "C minor",
  mode: "minor",
};

function uid(): string {
  return crypto.randomUUID();
}

function card<T extends CardTemplateId>(
  templateId: T,
  trackId: TrackId,
  nodeId: string,
  parameters: CardTemplateParams[T],
): BuiltCard<T> {
  return { id: uid(), templateId, trackId, nodeId, parameters };
}

// ───── triad voicings (root-position, in middle register) ──────────────────
const MAJOR = [0, 4, 7];
const MINOR = [0, 3, 7];

function triad(rootMidi: number, quality: "M" | "m"): number[] {
  const intervals = quality === "M" ? MAJOR : MINOR;
  return intervals.map((d) => rootMidi + d);
}

const ROOT: Record<string, number> = {
  C: 60,
  "C#": 61,
  Db: 61,
  D: 62,
  "D#": 63,
  Eb: 63,
  E: 64,
  F: 53,
  "F#": 54,
  Gb: 54,
  G: 55,
  "G#": 56,
  Ab: 56,
  A: 57,
  "A#": 58,
  Bb: 58,
  B: 59,
};

function chord(name: string, quality: "M" | "m"): number[] {
  const r = ROOT[name];
  if (r == null) throw new Error(`Unknown chord root: ${name}`);
  return triad(r, quality);
}

const CHORDS: Record<string, number[]> = {
  C: chord("C", "M"),
  F: chord("F", "M"),
  G: chord("G", "M"),
  Am: chord("A", "m"),
  Dm: chord("D", "m"),
  Em: chord("E", "m"),
  E: chord("E", "M"),
  D: chord("D", "M"),
};

// ───── helpers for randomized recognition prompts ──────────────────────────
function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function tonicVsNotPrompts(
  key: KeyContext,
  notTonicPool: number[],
  count: number,
  options: Array<{ label: string }>,
  /** index of options that's "tonic". */
  tonicOptionIndex: number,
  notTonicOptionIndex: number,
): CardTemplateParams["drone-degree-identify"]["prompts"] {
  const out: CardTemplateParams["drone-degree-identify"]["prompts"] = [];
  // approximately 50/50 tonic vs non-tonic
  for (let i = 0; i < count; i++) {
    const isTonic = Math.random() < 0.5;
    out.push({
      key,
      playedPitchClass: isTonic ? ((key.tonicMidi % 12) + 12) % 12 : pickRandom(notTonicPool),
      correctOptionIndex: isTonic ? tonicOptionIndex : notTonicOptionIndex,
    });
  }
  // Quietly suppress `_` lint by referencing options length.
  void options.length;
  return out;
}

function pcDegree(key: KeyContext, degreeIntervalSemitones: number): number {
  return (((key.tonicMidi + degreeIntervalSemitones) % 12) + 12) % 12;
}

const DEGREES_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DEGREES_MINOR = [0, 2, 3, 5, 7, 8, 10];

// ───── concept-explainer cards ─────────────────────────────────────────────
export function explainerForLevel(levelId: string): BuiltCard | null {
  switch (levelId) {
    // Track A
    case "A-1":
      return card("concept-explainer", "A", "A-1", {
        title: "Meet the tonic — your home pitch",
        terms: [
          {
            term: "Tonic",
            definition:
              "The home note of a key. The pitch the music keeps coming back to. In C major, the tonic is C.",
          },
        ],
        body: [
          "Today you only learn one thing: how home sounds. Tap Play drone and let C settle into your ear. Hum or sing along quietly if it helps.",
          "You don't need to name any other notes yet. Names come later — first, sound.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        scaleListen: { tonicMidi: C_MAJOR.tonicMidi, mode: "major" },
        continueLabel: "Got it",
      });
    case "A-2":
      return card("concept-explainer", "A", "A-2", {
        title: "Tonic again — this time in A minor",
        terms: [
          {
            term: "Minor key",
            definition:
              "A key whose home note has a darker, more inward color than major.",
          },
          {
            term: "Relative minor",
            definition:
              "Every major key has a minor twin that shares its notes. A minor is the relative minor of C major.",
          },
        ],
        body: [
          "A minor uses the same seven pitches as C major, but home is now A. The mood shifts even though the notes are the same.",
          "Use the A natural minor shape from Track C while you listen. Hum or play A wherever feels like home.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
        scaleListen: { tonicMidi: A_MINOR.tonicMidi, mode: "minor" },
        continueLabel: "Got it",
      });
    case "A-3":
      return card("concept-explainer", "A", "A-3", {
        title: "The Root — degree 1",
        terms: [
          {
            term: "Scale degree",
            definition:
              "A number 1-7 for each step of the key's scale, counted from the tonic. Degree 1 is the tonic.",
          },
          {
            term: "Root",
            definition:
              "The note a chord or scale is named after. Same pitch as the tonic of the key.",
          },
        ],
        body: [
          "Drone in C. Sing or play C anywhere on the neck. Notice the 'arrived, home' feeling.",
          "This is degree 1 — the foundation of every other degree you'll learn. Every other note in the key is heard relative to it.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        continueLabel: "Got it",
      });
    case "A-4":
      return card("concept-explainer", "A", "A-4", {
        title: "The 5th — stable, hovering",
        body: [
          "Over a C drone, G is the 5th. It feels stable but not 'home' — like floating slightly above the ground.",
          "Sing or play G. Move between G and C and feel the difference: G hovers; C lands.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        customListen: {
          label: "Hear root and 5th",
          sequence: [60, 67, 60],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "A-5":
      return card("concept-explainer", "A", "A-5", {
        title: "The 3rd — color in the key",
        terms: [
          {
            term: "Major third",
            definition:
              "Two whole steps above the tonic. The bright color of major.",
          },
          {
            term: "Minor third",
            definition:
              "Three half-steps above the tonic. The darker color of minor. Sometimes called the flat 3rd.",
          },
        ],
        body: [
          "E over a C drone is the 3rd. It's the note that makes C sound major — the bright, sweet color.",
          "Try Eb too — the flat 3rd. That's how minor sounds. Same root, different color. The 3rd is what determines major vs. minor.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        customListen: {
          label: "Hear major vs. minor",
          sequence: [60, 64, 60, 63],
          noteDurationSec: 0.6,
        },
        continueLabel: "Got it",
      });
    case "A-7":
      return card("concept-explainer", "A", "A-7", {
        title: "The 7th — pulls toward home",
        body: [
          "Over a C drone, B is the 7th. It's restless — wants to slip up to C. The leading tone of major.",
          "The flat 7 (Bb in C) is the bluesy color. Same scale degree, different mode. Most rock and blues lives on the flat 7.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        customListen: {
          label: "Hear the pull",
          sequence: [71, 72, 70],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "A-8":
      return card("concept-explainer", "A", "A-8", {
        title: "The 4th — suspended",
        body: [
          "F over C is the 4th — leaning, unsettled. It wants to fall back to E (the 3rd).",
          "Move 4 → 3 → 1 and feel the resolve. This is the classic 'sus' sound resolving to home.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        customListen: {
          label: "Hear 4 → 3 → 1",
          sequence: [65, 64, 60],
          noteDurationSec: 0.65,
        },
        continueLabel: "Got it",
      });
    case "A-9":
      return card("concept-explainer", "A", "A-9", {
        title: "The 2nd — light tension",
        body: [
          "D over C is the 2nd. A small, gentle pull — can resolve up to the 3rd or down to the root.",
          "It's the smallest tense interval in the scale. Used as a passing tone everywhere in melodies.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        continueLabel: "Got it",
      });
    case "A-10":
      return card("concept-explainer", "A", "A-10", {
        title: "The 6th — wistful",
        body: [
          "A over C is the 6th — bright but wistful. The 'longing' sound.",
          "In minor (the flat 6), it's darker and heavier. We'll meet that flavor in real songs later.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        continueLabel: "Got it",
      });
    case "A-11":
      return card("concept-explainer", "A", "A-11", {
        title: "Chord Tones — solo on 1, flat 3, 5",
        terms: [
          {
            term: "Chord tones",
            definition:
              "The notes that make up a chord. For a minor chord, those are the root, flat 3rd, and 5th.",
          },
        ],
        body: [
          "Over an A minor vamp, restrict yourself to the chord tones of the i chord: A (root), C (flat 3rd), E (5th). Three notes only.",
          "Notice how every phrase sounds resolved when you stay on these three pitches. This is the home base for blues and minor-key soloing.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
        continueLabel: "Got it",
      });
    case "A-12":
      return card("concept-explainer", "A", "A-12", {
        title: "The Flat 7 — blues vocabulary",
        body: [
          "Add G (flat 7) to A, C, E. The blues spelling: 1, flat 3, 5, flat 7.",
          "These four pitches are the core voice of minor-key blues phrasing. Every Hazel and Mayer minor solo lives in this sound.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
        customListen: {
          label: "Hear the four notes",
          sequence: [57, 60, 64, 67],
          noteDurationSec: 0.55,
        },
        continueLabel: "Got it",
      });
    // Track B
    case "B-1":
      return card("concept-explainer", "B", "B-1", {
        title: "Solidify the low E string",
        body: [
          "Track B is pure fretboard recall — separate from ear training, but it makes everything you hear in Track A land faster.",
          "First foothold: own the 6th string (low E). Frets give names; names give freedom.",
        ],
        continueLabel: "Got it",
      });
    case "B-3":
      return card("concept-explainer", "B", "B-3", {
        title: "C across all six strings",
        body: [
          "Same letter, six places. Owning one note across the neck is the gateway to owning all of them.",
          "Find every C from low E to high E, lowest fret only.",
        ],
        continueLabel: "Got it",
      });
    case "B-7":
      return card("concept-explainer", "B", "B-7", {
        title: "Sharps and flats — the in-between notes",
        terms: [
          {
            term: "Sharp",
            definition:
              "One half-step (one fret) above the natural note. F# is one fret above F.",
          },
          {
            term: "Flat",
            definition:
              "One half-step below. Bb is one fret below B. Same fret as A#.",
          },
          {
            term: "Enharmonic",
            definition: "Two names for the same pitch. F# and Gb are the same fret.",
          },
        ],
        body: [
          "Between most natural notes there's a sharp/flat — one fret up or down. F# is one fret above F.",
          "We've been working in natural notes only. Now we add the sharps and flats. The fretboard fills in.",
        ],
        continueLabel: "Got it",
      });
    case "B-10":
      return card("concept-explainer", "B", "B-10", {
        title: "Speed — under 2 seconds",
        body: [
          "You know where every note lives. Now make it instant.",
          "From now on, prompts include a 2-second timer. Beat it consistently and you've reached the speed milestone.",
        ],
        continueLabel: "Got it",
      });
    // ─── Track C (revised: open → movable → pentatonic → CAGED) ─────────
    case "C-1":
      return card("concept-explainer", "C", "C-1", {
        title: "Open C major scale — your first shape",
        terms: [
          {
            term: "Scale",
            definition:
              "A sequence of notes within a key, played in order. The C major scale is the seven notes of C major, played C, D, E, F, G, A, B, C.",
          },
          {
            term: "Open string",
            definition:
              "A string played without pressing any fret — just plucked. The shape uses several open strings.",
          },
        ],
        body: [
          "The most-taught beginner scale in guitar. Uses open strings and the first three frets. You'll hear it in countless songs.",
          "Memorize the fingering first. Theory comes after. Tap 'Hear the scale' to learn what it sounds like before you play it.",
        ],
        scaleListen: { tonicMidi: C_MAJOR.tonicMidi, mode: "major" },
        fretboardShape: {
          title: "Open C major — frets 0–3 across strings 5, 4, 3, 2.",
          maxFret: 4,
          steps: [
            { stringIndex: 4, fret: 3 },
            { stringIndex: 3, fret: 0 },
            { stringIndex: 3, fret: 2 },
            { stringIndex: 3, fret: 3 },
            { stringIndex: 2, fret: 0 },
            { stringIndex: 2, fret: 2 },
            { stringIndex: 1, fret: 0 },
            { stringIndex: 1, fret: 1 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-2":
      return card("concept-explainer", "C", "C-2", {
        title: "Open A minor scale — same notes, new home",
        terms: [
          {
            term: "Relative minor",
            definition:
              "Every major key has a minor twin that uses the same notes. A minor is the relative minor of C major.",
          },
          {
            term: "Natural minor scale",
            definition:
              "The most common minor scale. Same notes as the relative major, but starting from a different home.",
          },
        ],
        body: [
          "Notice anything? This scale uses the exact same notes as C major. Same frets, same strings, same fingerings — almost.",
          "The only difference: it starts and ends on A. When the music keeps coming back to A, your ear hears it as minor — darker, more inward.",
          "This is the relative minor relationship: every major scale has a minor twin that shares all its notes.",
        ],
        scaleListen: { tonicMidi: A_MINOR.tonicMidi, mode: "minor" },
        fretboardShape: {
          title: "Open A natural minor — open strings + frets 2–3.",
          maxFret: 4,
          steps: [
            { stringIndex: 4, fret: 0 },
            { stringIndex: 4, fret: 2 },
            { stringIndex: 4, fret: 3 },
            { stringIndex: 3, fret: 0 },
            { stringIndex: 3, fret: 2 },
            { stringIndex: 3, fret: 3 },
            { stringIndex: 2, fret: 0 },
            { stringIndex: 2, fret: 2 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-3":
      return card("concept-explainer", "C", "C-3", {
        title: "Movable major scale — anchored to the root",
        terms: [
          {
            term: "Movable shape",
            definition:
              "A scale or chord pattern that keeps the same fingering when slid up or down the neck. Where the root lands determines the key.",
          },
          {
            term: "Root note",
            definition:
              "The note the scale or chord is named after. In G major, the root is G.",
          },
        ],
        body: [
          "Open scales are easy but they only work in one key. Movable scales work in every key — same fingering, slid to wherever you want home to be.",
          "This shape's root sits on the 6th string. Wherever the root lands, that's the major key you're playing in. We'll start in G major, with the root at the 3rd fret of the 6th string.",
          "This is the foundational fretboard concept of guitar: a shape is fixed; the root moves. Every CAGED shape later will follow the same logic.",
        ],
        scaleListen: { tonicMidi: 55, mode: "major" },
        fretboardShape: {
          title: "Movable major (E-shape) — G major, root at 6/3.",
          maxFret: 8,
          steps: [
            { stringIndex: 5, fret: 3 },
            { stringIndex: 5, fret: 5 },
            { stringIndex: 5, fret: 7 },
            { stringIndex: 4, fret: 3 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 4, fret: 7 },
            { stringIndex: 3, fret: 4 },
            { stringIndex: 3, fret: 5 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-4":
      return card("concept-explainer", "C", "C-4", {
        title: "Movable minor scale — flatten three notes",
        terms: [
          {
            term: "Flat 3rd",
            definition:
              "The minor 3rd. One fret below the major 3rd. The note that gives minor its dark color.",
          },
          {
            term: "Flat 6th",
            definition:
              "Used in natural minor. Adds the 'longing' or melancholy quality.",
          },
          {
            term: "Flat 7th",
            definition:
              "Used in natural minor. The bluesy, modal flavor — common in rock and blues.",
          },
        ],
        body: [
          "The movable minor scale uses the same anchor: root on the 6th string. Same shape concept — only the fingering shifts slightly because three notes lower by a fret.",
          "Compared to major: the 3rd, 6th, and 7th drop by one fret. Those three flat notes are what give minor its darker color.",
          "We'll start in A minor, root at the 5th fret of the 6th string. Slide the same shape anywhere on the neck for any minor key.",
        ],
        scaleListen: { tonicMidi: A_MINOR.tonicMidi, mode: "minor" },
        fretboardShape: {
          title: "Movable minor (E-shape) — A minor, root at 6/5.",
          maxFret: 9,
          steps: [
            { stringIndex: 5, fret: 5 },
            { stringIndex: 5, fret: 7 },
            { stringIndex: 5, fret: 8 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 4, fret: 7 },
            { stringIndex: 4, fret: 8 },
            { stringIndex: 3, fret: 5 },
            { stringIndex: 3, fret: 7 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-5":
      return card("concept-explainer", "C", "C-5", {
        title: "Pentatonic Box 1 — the subset that solos",
        terms: [
          {
            term: "Pentatonic",
            definition:
              "Five-note scale. From the Greek 'penta' (five). The minor pentatonic removes the 2nd and flat 6th from the natural minor.",
          },
        ],
        body: [
          "The minor pentatonic is the minor scale with two notes removed: the 2nd and the flat 6th. What's left is five notes that almost always sound 'right' over a minor groove.",
          "Box 1 is the iconic minor pentatonic shape. Two notes per string, root on the 6th string. Every blues, rock, and Mayer-style solo lives here.",
          "Notice you already know these notes — they're a subset of the movable minor scale you just learned. The pentatonic is the chord-tone-rich subset; the missing notes were the tense color tones.",
        ],
        fretboardShape: {
          title: "A minor pentatonic — Box 1 at the 5th fret.",
          maxFret: 9,
          steps: [
            { stringIndex: 5, fret: 5 },
            { stringIndex: 5, fret: 8 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 4, fret: 7 },
            { stringIndex: 3, fret: 5 },
            { stringIndex: 3, fret: 7 },
            { stringIndex: 2, fret: 5 },
            { stringIndex: 2, fret: 8 },
            { stringIndex: 1, fret: 5 },
            { stringIndex: 1, fret: 8 },
            { stringIndex: 0, fret: 5 },
            { stringIndex: 0, fret: 8 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-6":
      return card("concept-explainer", "C", "C-6", {
        title: "Roots inside Box 1",
        body: [
          "Inside Box 1, the root note (A in A minor) lives in three places: 6th string 5th fret, 4th string 7th fret, 1st string 5th fret.",
          "Knowing roots first turns the box into a real chord-tone map. Every solo eventually needs to land on or near a root — these are your home bases.",
        ],
        fretboardShape: {
          title: "Box 1 — the three A's highlighted.",
          maxFret: 9,
          steps: [
            { stringIndex: 5, fret: 5 },
            { stringIndex: 3, fret: 7 },
            { stringIndex: 0, fret: 5 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-7":
      return card("concept-explainer", "C", "C-7", {
        title: "All chord tones inside Box 1",
        body: [
          "The chord tones of A minor are the root (A), the flat 3rd (C), and the 5th (E). These are the notes that make up an A minor chord.",
          "Inside Box 1, these three notes appear at predictable spots. Phrases that land on chord tones sound resolved. Phrases that land on the other pentatonic notes (D, G) sound like motion — passing through.",
          "Roots: 6/5, 4/7, 1/5. Flat 3rds: 6/8, 3/5, 1/8. Fifths: 5/7, 2/7.",
        ],
        continueLabel: "Got it",
      });
    case "C-8":
      return card("concept-explainer", "C", "C-8", {
        title: "CAGED — the system that ties chords to scales",
        terms: [
          {
            term: "CAGED",
            definition:
              "A system that organizes the fretboard into five chord shapes you already know: C, A, G, E, D. Slid up the neck, they cover everything.",
          },
          {
            term: "Barre chord",
            definition:
              "A chord where one finger holds down all six strings at one fret while other fingers form a chord shape. The E-shape barre is functionally an open E chord moved up the neck.",
          },
        ],
        body: [
          "The cleanest way into CAGED is something you already do: barre chords. When you play an F barre at the 1st fret, your hand makes an E-shape — same fingering as an open E chord, with a barre instead of the nut. When you play a B barre at the 2nd fret, your hand makes an A-shape. You're already using two of the five CAGED shapes whenever you barre.",
          "The five shapes correspond to the five open chords: C, A, G, E, D. Any chord can be played in all five shapes somewhere on the neck. They always appear in the order C-A-G-E-D up the neck (and loop back around).",
          "The soloing payoff: each shape contains the chord's root, 3rd, and 5th in predictable spots. In the E-shape barre, the root is on strings 6, 4, and 1. The 3rd is on string 3. The 5th is on strings 5 and 2. Once you know that pattern for one shape, you can find chord tones for any chord you're playing in that shape — anywhere on the neck.",
          "CAGED isn't a separate scale system. It's a way of organizing chord tones across the neck using shapes you mostly already know.",
        ],
        fretboardShape: {
          title: "G major in E-shape barre (3rd fret).",
          maxFret: 6,
          steps: [
            { stringIndex: 5, fret: 3 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 3, fret: 5 },
            { stringIndex: 2, fret: 4 },
            { stringIndex: 1, fret: 3 },
            { stringIndex: 0, fret: 3 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-9":
      return card("concept-explainer", "C", "C-9", {
        title: "E-shape CAGED — minor",
        body: [
          "Same shape; the 3rd flattens to a flat 3rd.",
          "In G minor (E-shape at the 3rd fret): roots and 5ths stay where they were. The 3rd on string 3 drops one fret, becoming a flat 3rd.",
          "This means once you've memorized the E-shape, you have minor chord tones available anywhere on the neck — just remember to flatten the 3rd.",
        ],
        fretboardShape: {
          title: "G minor in E-shape barre — flat 3rd at 3/3.",
          maxFret: 6,
          steps: [
            { stringIndex: 5, fret: 3 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 3, fret: 5 },
            { stringIndex: 2, fret: 3 },
            { stringIndex: 1, fret: 3 },
            { stringIndex: 0, fret: 3 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-10":
      return card("concept-explainer", "C", "C-10", {
        title: "Pentatonic Box 2",
        body: [
          "The next pentatonic box up the neck. Same five pitches as Box 1, in a new fretboard region.",
          "Box 2 sits a few frets above Box 1, with the lowest note starting on C (the flat 3rd of A) on the 6th string.",
          "Owning two boxes lets you solo across a much wider region of the neck without losing the key center.",
        ],
        fretboardShape: {
          title: "A minor pentatonic — Box 2.",
          maxFret: 11,
          steps: [
            { stringIndex: 5, fret: 8 },
            { stringIndex: 5, fret: 10 },
            { stringIndex: 4, fret: 7 },
            { stringIndex: 4, fret: 10 },
            { stringIndex: 3, fret: 7 },
            { stringIndex: 3, fret: 9 },
            { stringIndex: 2, fret: 8 },
            { stringIndex: 2, fret: 10 },
            { stringIndex: 1, fret: 8 },
            { stringIndex: 1, fret: 10 },
            { stringIndex: 0, fret: 8 },
            { stringIndex: 0, fret: 10 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-11":
      return card("concept-explainer", "C", "C-11", {
        title: "Chord tones inside Box 2",
        body: [
          "Same labels as Box 1. New geometry. Find roots, flat 3rds, and 5ths.",
          "Roots in Box 2: 4th string 7th fret, 2nd string 10th fret. Flat 3rds: 6th string 8th fret, 4th string 10th fret, 1st string 8th fret. Fifths: 5th string 7th fret, 3rd string 9th fret.",
        ],
        continueLabel: "Got it",
      });
    case "C-12":
      return card("concept-explainer", "C", "C-12", {
        title: "A-shape CAGED — chord tones",
        body: [
          "The A-shape barre is functionally an open A chord moved up the neck.",
          "In an A-shape major: root sits on strings 5 and 2. The 3rd on strings 4 and 1. The 5th on string 3.",
          "We'll learn it in C major: A-shape barre at the 3rd fret. Combined with the E-shape (from C·8), you can now find chord tones in two CAGED positions across the neck.",
        ],
        fretboardShape: {
          title: "C major in A-shape barre — root at 5/3.",
          maxFret: 6,
          steps: [
            { stringIndex: 4, fret: 3 },
            { stringIndex: 3, fret: 5 },
            { stringIndex: 2, fret: 5 },
            { stringIndex: 1, fret: 5 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-13":
      return card("concept-explainer", "C", "C-13", {
        title: "Major scale around the A-shape",
        body: [
          "Just like the E-shape has its own major scale shape (C·3), the A-shape has its own. The full scale lives around the A-shape barre chord.",
          "We'll learn it in C major. Combined with the E-shape major scale (in G), you can play any major key in two regions of the neck.",
          "The A-shape major scale is anchored to the root on the 5th string. Same principle as before: shape is fixed, root moves to whatever key you want.",
        ],
        scaleListen: { tonicMidi: C_MAJOR.tonicMidi, mode: "major" },
        fretboardShape: {
          title: "C major — A-shape position, root at 5/3.",
          maxFret: 6,
          steps: [
            { stringIndex: 4, fret: 3 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 3, fret: 2 },
            { stringIndex: 3, fret: 3 },
            { stringIndex: 3, fret: 5 },
            { stringIndex: 2, fret: 2 },
            { stringIndex: 2, fret: 4 },
            { stringIndex: 2, fret: 5 },
          ],
        },
        continueLabel: "Got it",
      });
    case "C-14":
      return card("concept-explainer", "C", "C-14", {
        title: "Connect the boxes — one continuous map",
        body: [
          "You've learned two pentatonic boxes and two CAGED positions. Now connect them. The fretboard isn't five disconnected shapes — it's one continuous map.",
          "Phrases that move smoothly between Box 1 and Box 2 give you the entire neck to solo across, without ever losing the key.",
        ],
        fretboardShape: {
          title: "Box 1 + Box 2 together — the full pentatonic map.",
          maxFret: 11,
          steps: [
            { stringIndex: 5, fret: 5 },
            { stringIndex: 5, fret: 8 },
            { stringIndex: 5, fret: 10 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 4, fret: 7 },
            { stringIndex: 4, fret: 10 },
            { stringIndex: 3, fret: 5 },
            { stringIndex: 3, fret: 7 },
            { stringIndex: 3, fret: 9 },
            { stringIndex: 2, fret: 5 },
            { stringIndex: 2, fret: 8 },
            { stringIndex: 2, fret: 10 },
            { stringIndex: 1, fret: 5 },
            { stringIndex: 1, fret: 8 },
            { stringIndex: 1, fret: 10 },
            { stringIndex: 0, fret: 5 },
            { stringIndex: 0, fret: 8 },
            { stringIndex: 0, fret: 10 },
          ],
        },
        continueLabel: "Got it",
      });
    // Track D
    case "D-1":
      return card("concept-explainer", "D", "D-1", {
        title: "I, IV, V — the three pillars",
        terms: [
          {
            term: "I (the one chord)",
            definition: "The home chord. Built on the tonic. C in C major.",
          },
          {
            term: "IV (the four chord)",
            definition:
              "Built on the 4th degree of the key. F in C major. Sounds 'lifted.'",
          },
          {
            term: "V (the five chord)",
            definition:
              "Built on the 5th degree. G in C major. Sounds tense, wants to resolve to I.",
          },
        ],
        body: [
          "Eighty percent of pop, rock, and blues lives in three chords: I, IV, V.",
          "Before testing recognition, play them yourself. In C major: C, F, G. Strum each slowly. Notice IV (F) lifts. V (G) leans toward the I. The I lands.",
          "Strum C → F → C → G → C on your guitar. Listen to each move. Then continue.",
        ],
        chordProgressionListen: {
          label: "Hear C → F → C → G → C",
          chords: [CHORDS.C!, CHORDS.F!, CHORDS.C!, CHORDS.G!, CHORDS.C!],
        },
        continueLabel: "I felt them",
      });
    case "D-2":
      return card("concept-explainer", "D", "D-2", {
        title: "vi — the sad home",
        body: [
          "vi is the relative minor of I — same pitch family, darker color. In C major, vi is Am.",
          "Together with I, IV, V, the vi covers half of all popular music. The 'four chords of pop' is I-V-vi-IV.",
        ],
        chordProgressionListen: {
          label: "Hear I-V-vi-IV in C",
          chords: [CHORDS.C!, CHORDS.G!, CHORDS.Am!, CHORDS.F!],
        },
        continueLabel: "Got it",
      });
    case "D-4":
      return card("concept-explainer", "D", "D-4", {
        title: "Minor key changes — i, iv, v, flat VII",
        body: [
          "In a minor key, home is the i chord (lowercase = minor). Common moves: i → iv, i → v (or V), i → flat VII, i → flat VI.",
          "The flat VII is the 'rock minor' sound — modal, doesn't pull as hard as a major V would.",
        ],
        chordProgressionListen: {
          label: "Hear i → flat VII → i in A minor",
          chords: [CHORDS.Am!, CHORDS.G!, CHORDS.Am!],
        },
        continueLabel: "Got it",
      });
    // Track E
    case "E-1":
      return card("concept-explainer", "E", "E-1", {
        title: "Major 2nd — two frets",
        body: [
          "An interval is the distance between two notes. A major 2nd is two semitones — two frets on one string.",
          "Listen. The first two notes of 'Happy Birthday' are a major 2nd up. Tense but small — wants to keep moving.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 62, 60],
          noteDurationSec: 0.55,
        },
        continueLabel: "Got it",
      });
    case "E-2":
      return card("concept-explainer", "E", "E-2", {
        title: "Major 3rd — four frets",
        body: [
          "Four semitones. Bright. The defining color of a major chord.",
          "The opening of 'Oh When the Saints' is a major 3rd up. Warm and resolved.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 64],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-3":
      return card("concept-explainer", "E", "E-3", {
        title: "Perfect 4th — five frets",
        body: [
          "Five semitones. Strong, anchored. 'Here Comes the Bride' opens with a perfect 4th up.",
          "On guitar, a perfect 4th is the move from one string to the same fret on the next string — except between G and B, which is a major 3rd.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 65],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-4":
      return card("concept-explainer", "E", "E-4", {
        title: "Minor 3rd — three frets",
        body: [
          "Three semitones. The color of minor. Darker than the major 3rd.",
          "The first two notes of 'Greensleeves' are a minor 3rd up. Brooding, inward.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 63],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-5":
      return card("concept-explainer", "E", "E-5", {
        title: "Perfect 5th — seven frets",
        body: [
          "Seven semitones. Open, hovering — the power-chord sound.",
          "'Twinkle Twinkle' opens with a perfect 5th up (between 'Twinkle' and 'Twinkle').",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 67],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-6":
      return card("concept-explainer", "E", "E-6", {
        title: "Minor 7th — ten frets",
        body: [
          "Ten semitones. The bluesy flat 7 against the root. Dominant, unresolved.",
          "Used everywhere in blues and Mayer-style minor playing.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 70],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-7":
      return card("concept-explainer", "E", "E-7", {
        title: "Intervals descending",
        body: [
          "Same intervals, played downward. Your ear has to learn to recognize them in either direction.",
          "Most users find descending intervals slightly harder. Don't panic if your accuracy drops at first.",
        ],
        continueLabel: "Got it",
      });
    default:
      return null;
  }
}

// ───── practice cards ──────────────────────────────────────────────────────
// Reusable button sets
const HOME_OR_NOT: Array<{ label: string }> = [
  { label: "Home (the tonic)" },
  { label: "Not home" },
];
const ROOT_OR_NOT: Array<{ label: string }> = [
  { label: "The root" },
  { label: "Not the root" },
];
const ROOT_OR_5: Array<{ label: string }> = [
  { label: "The root" },
  { label: "The 5th" },
];
const STABLE_3: Array<{ label: string }> = [
  { label: "The root" },
  { label: "The flat 3rd" },
  { label: "The 5th" },
];
const STABLE_3_GENERIC: Array<{ label: string }> = [
  { label: "Root" },
  { label: "3rd" },
  { label: "5th" },
];
const SEVEN_DEGREE_BUTTONS: Array<{ label: string }> = [
  { label: "1 (root)" },
  { label: "2" },
  { label: "3" },
  { label: "4" },
  { label: "5" },
  { label: "6" },
  { label: "7" },
];

function dronePlay(
  trackId: TrackId,
  levelId: string,
  key: KeyContext,
  prompts: CardTemplateParams["drone-degree-play"]["prompts"],
  uiTitle?: string,
  uiDescription?: string,
): BuiltCard<"drone-degree-play"> {
  return card("drone-degree-play", trackId, levelId, {
    keyLabel: key.keyLabel,
    tonicMidi: key.tonicMidi,
    mode: key.mode,
    prompts,
    uiTitle,
    uiDescription,
  });
}

function droneIdentify(
  trackId: TrackId,
  levelId: string,
  options: Array<{ label: string }>,
  prompts: CardTemplateParams["drone-degree-identify"]["prompts"],
  uiTitle?: string,
  uiDescription?: string,
): BuiltCard<"drone-degree-identify"> {
  return card("drone-degree-identify", trackId, levelId, {
    options,
    prompts,
    uiTitle,
    uiDescription,
  });
}

function noteFinding(
  levelId: string,
  params: CardTemplateParams["note-finding-play"],
): BuiltCard<"note-finding-play"> {
  return card("note-finding-play", "B", levelId, params);
}

function shapeRecall(
  levelId: string,
  params: CardTemplateParams["shape-recall-play"],
): BuiltCard<"shape-recall-play"> {
  return card("shape-recall-play", "C", levelId, params);
}

function chordIdentify(
  levelId: string,
  options: Array<{ label: string }>,
  prompts: CardTemplateParams["chord-change-identify"]["prompts"],
  uiTitle?: string,
): BuiltCard<"chord-change-identify"> {
  return card("chord-change-identify", "D", levelId, {
    options,
    prompts,
    uiTitle,
  });
}

function intervalIdentify(
  levelId: string,
  options: Array<{ label: string }>,
  prompts: CardTemplateParams["interval-identify"]["prompts"],
): BuiltCard<"interval-identify"> {
  return card("interval-identify", "E", levelId, {
    options,
    prompts,
  });
}

function intervalPlay(
  levelId: string,
  prompt: string,
  baseMidi: number,
  semitones: number,
  direction: "up" | "down",
  label: string,
): BuiltCard<"interval-play"> {
  return card("interval-play", "E", levelId, {
    prompt,
    baseMidi,
    semitones,
    direction,
    label,
  });
}

// Build N tonic-vs-not prompts at session-build time (random sampling).
function tonicIdentifyPrompts(
  key: KeyContext,
  count: number,
): CardTemplateParams["drone-degree-identify"]["prompts"] {
  const tonicPc = ((key.tonicMidi % 12) + 12) % 12;
  const scale = key.mode === "major" ? DEGREES_MAJOR : DEGREES_MINOR;
  const notTonicPool = scale
    .filter((d) => d !== 0)
    .map((d) => ((key.tonicMidi + d) % 12 + 12) % 12);
  return tonicVsNotPrompts(key, notTonicPool, count, HOME_OR_NOT, 0, 1).map(
    (p) => ({
      ...p,
      // override label-aware data: ensure tonic correctly maps to index 0
      correctOptionIndex: p.playedPitchClass === tonicPc ? 0 : 1,
    }),
  );
}

// Build N "root vs not" prompts (different label set; logic identical).
function rootVsNotPrompts(
  key: KeyContext,
  count: number,
): CardTemplateParams["drone-degree-identify"]["prompts"] {
  return tonicIdentifyPrompts(key, count);
}

function rootOrFifthPrompts(
  key: KeyContext,
  count: number,
): CardTemplateParams["drone-degree-identify"]["prompts"] {
  const out: CardTemplateParams["drone-degree-identify"]["prompts"] = [];
  for (let i = 0; i < count; i++) {
    const isRoot = Math.random() < 0.5;
    out.push({
      key,
      playedPitchClass: isRoot ? 0 : pcDegree(key, 7),
      correctOptionIndex: isRoot ? 0 : 1,
    });
  }
  // Re-baseline pitch classes against actual key tonic
  return out.map((p) => ({
    ...p,
    playedPitchClass:
      p.correctOptionIndex === 0
        ? ((key.tonicMidi % 12) + 12) % 12
        : pcDegree(key, 7),
  }));
}

function stableTonesPrompts(
  key: KeyContext,
  count: number,
): CardTemplateParams["drone-degree-identify"]["prompts"] {
  // index 0 = root, 1 = (flat) 3rd, 2 = 5th
  const semitone3 = key.mode === "major" ? 4 : 3;
  const out: CardTemplateParams["drone-degree-identify"]["prompts"] = [];
  for (let i = 0; i < count; i++) {
    const which = i % 3 === 0 ? 0 : Math.floor(Math.random() * 3);
    out.push({
      key,
      playedPitchClass:
        which === 0
          ? ((key.tonicMidi % 12) + 12) % 12
          : which === 1
            ? pcDegree(key, semitone3)
            : pcDegree(key, 7),
      correctOptionIndex: which,
    });
  }
  return out;
}

function fullDiatonicPrompts(
  key: KeyContext,
  count: number,
): CardTemplateParams["drone-degree-identify"]["prompts"] {
  const scale = key.mode === "major" ? DEGREES_MAJOR : DEGREES_MINOR;
  const out: CardTemplateParams["drone-degree-identify"]["prompts"] = [];
  for (let i = 0; i < count; i++) {
    const degIdx = Math.floor(Math.random() * 7);
    out.push({
      key,
      playedPitchClass: pcDegree(key, scale[degIdx]!),
      correctOptionIndex: degIdx,
    });
  }
  return out;
}

export function practiceCardsForLevel(levelId: string): BuiltCard[] {
  switch (levelId) {
    // ─── Track A ────────────────────────────────────────────
    case "A-1":
      return [
        droneIdentify(
          "A",
          "A-1",
          HOME_OR_NOT,
          tonicIdentifyPrompts(C_MAJOR, 4),
          "Tonic recognition — C major",
          "Drone in C. After each note plays, choose Home or Not home.",
        ),
      ];
    case "A-2":
      return [
        droneIdentify(
          "A",
          "A-2",
          HOME_OR_NOT,
          tonicIdentifyPrompts(A_MINOR, 4),
          "Tonic recognition — A minor",
        ),
        droneIdentify(
          "A",
          "A-2",
          HOME_OR_NOT,
          [
            { key: C_MAJOR, playedPitchClass: 0, correctOptionIndex: 0 },
            { key: C_MAJOR, playedPitchClass: 9, correctOptionIndex: 1 },
            {
              key: A_MINOR,
              playedPitchClass: 9,
              correctOptionIndex: 0,
              transitionText:
                "Now home has changed. Same note can mean different things.",
            },
            { key: A_MINOR, playedPitchClass: 0, correctOptionIndex: 1 },
          ],
          "Compare home in two keys",
          "Notice how C felt like home in the first half, but not the second? Same pitch — different key.",
        ),
      ];
    case "A-3":
      return [
        dronePlay("A", "A-3", C_MAJOR, [
          { text: "Play the root.", expectedPitchClasses: [0] },
        ]),
        droneIdentify(
          "A",
          "A-3",
          ROOT_OR_NOT,
          rootVsNotPrompts(C_MAJOR, 4),
          "Identify the root",
        ),
      ];
    case "A-4":
      return [
        dronePlay("A", "A-4", C_MAJOR, [
          { text: "Play the 5th.", expectedPitchClasses: [7] },
        ]),
        dronePlay(
          "A",
          "A-4",
          C_MAJOR,
          [
            { text: "Play the root.", expectedPitchClasses: [0] },
            { text: "Now play the 5th.", expectedPitchClasses: [7] },
            { text: "Now back to the root.", expectedPitchClasses: [0] },
          ],
          "Move between root and 5th",
        ),
        droneIdentify(
          "A",
          "A-4",
          ROOT_OR_5,
          rootOrFifthPrompts(C_MAJOR, 5),
          "Root vs. 5th",
        ),
      ];
    case "A-5":
      return [
        dronePlay("A", "A-5", C_MAJOR, [
          { text: "Play the 3rd.", expectedPitchClasses: [4] },
        ]),
        dronePlay("A", "A-5", A_MINOR, [
          {
            text: "Play the 3rd. In A minor, this is the flat 3rd.",
            expectedPitchClasses: [0],
          },
        ]),
        droneIdentify(
          "A",
          "A-5",
          [{ label: "Major 3rd (bright)" }, { label: "Minor 3rd (dark)" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 4; i++) {
              const isMajor = Math.random() < 0.5;
              out.push({
                key: isMajor ? C_MAJOR : C_MINOR_LABEL,
                playedPitchClass: isMajor ? 4 : 3,
                correctOptionIndex: isMajor ? 0 : 1,
              });
            }
            return out;
          })(),
          "Hear major vs. minor 3rd",
        ),
        dronePlay(
          "A",
          "A-5",
          C_MAJOR,
          [
            { text: "Play the root.", expectedPitchClasses: [0] },
            { text: "Now play the 3rd.", expectedPitchClasses: [4] },
            { text: "Now play the 5th.", expectedPitchClasses: [7] },
          ],
          "Move root → 3rd → 5th",
        ),
      ];
    case "A-6":
      return [
        dronePlay(
          "A",
          "A-6",
          A_MINOR,
          [
            { text: "Play the root.", expectedPitchClasses: [9] },
            { text: "Now play the flat 3rd.", expectedPitchClasses: [0] },
            { text: "Now play the 5th.", expectedPitchClasses: [4] },
          ],
          "Stable tones in A minor",
        ),
        droneIdentify(
          "A",
          "A-6",
          STABLE_3,
          stableTonesPrompts(A_MINOR, 5),
          "Stable tones recognition — A minor",
        ),
        droneIdentify(
          "A",
          "A-6",
          STABLE_3_GENERIC,
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const inMinor = Math.random() < 0.5;
              const k = inMinor ? A_MINOR : C_MAJOR;
              const choice = Math.floor(Math.random() * 3);
              const semitone3 = inMinor ? 3 : 4;
              const pc =
                choice === 0
                  ? ((k.tonicMidi % 12) + 12) % 12
                  : choice === 1
                    ? pcDegree(k, semitone3)
                    : pcDegree(k, 7);
              out.push({
                key: k,
                playedPitchClass: pc,
                correctOptionIndex: choice,
              });
            }
            return out;
          })(),
          "Stable tones — cross-key",
          "Identify the function regardless of key.",
        ),
      ];
    case "A-7":
      return [
        dronePlay("A", "A-7", C_MAJOR, [
          { text: "Play the 7th.", expectedPitchClasses: [11] },
        ]),
        dronePlay("A", "A-7", A_MINOR, [
          { text: "Play the flat 7.", expectedPitchClasses: [7] },
        ]),
        dronePlay(
          "A",
          "A-7",
          C_MAJOR,
          [
            { text: "Play the 7th.", expectedPitchClasses: [11] },
            { text: "Now resolve to the root.", expectedPitchClasses: [0] },
          ],
          "Resolve 7 → 1",
        ),
        droneIdentify(
          "A",
          "A-7",
          [
            { label: "The 7th (leading tone)" },
            { label: "The flat 7 (bluesy)" },
          ],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const major7 = Math.random() < 0.5;
              out.push({
                key: C_MAJOR,
                playedPitchClass: major7 ? 11 : 10,
                correctOptionIndex: major7 ? 0 : 1,
              });
            }
            return out;
          })(),
          "7 vs. flat 7",
        ),
      ];
    case "A-8":
      return [
        dronePlay("A", "A-8", C_MAJOR, [
          { text: "Play the 4th.", expectedPitchClasses: [5] },
        ]),
        dronePlay(
          "A",
          "A-8",
          C_MAJOR,
          [
            { text: "Play the 4th.", expectedPitchClasses: [5] },
            { text: "Now resolve down to the 3rd.", expectedPitchClasses: [4] },
          ],
          "Resolve 4 → 3",
        ),
        droneIdentify(
          "A",
          "A-8",
          [
            { label: "The 3rd (resolved)" },
            { label: "The 4th (leaning)" },
          ],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const isThree = Math.random() < 0.5;
              out.push({
                key: C_MAJOR,
                playedPitchClass: isThree ? 4 : 5,
                correctOptionIndex: isThree ? 0 : 1,
              });
            }
            return out;
          })(),
          "3 vs. 4",
        ),
      ];
    case "A-9":
      return [
        dronePlay("A", "A-9", C_MAJOR, [
          { text: "Play the 2nd.", expectedPitchClasses: [2] },
        ]),
        droneIdentify(
          "A",
          "A-9",
          [{ label: "Root" }, { label: "2nd" }, { label: "3rd" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            const map = [0, 2, 4];
            for (let i = 0; i < 5; i++) {
              const idx = Math.floor(Math.random() * 3);
              out.push({
                key: C_MAJOR,
                playedPitchClass: map[idx]!,
                correctOptionIndex: idx,
              });
            }
            return out;
          })(),
          "Identify 2 vs. neighbors",
        ),
      ];
    case "A-10":
      return [
        dronePlay("A", "A-10", C_MAJOR, [
          { text: "Play the 6th.", expectedPitchClasses: [9] },
        ]),
        droneIdentify(
          "A",
          "A-10",
          SEVEN_DEGREE_BUTTONS,
          fullDiatonicPrompts(C_MAJOR, 6),
          "Full diatonic identify",
        ),
      ];
    case "A-11":
      return [
        dronePlay(
          "A",
          "A-11",
          A_MINOR,
          [
            {
              text: "Play any chord tone of A minor (root, flat 3rd, or 5th).",
              expectedPitchClasses: [9, 0, 4],
            },
          ],
          "Play any chord tone",
        ),
        dronePlay(
          "A",
          "A-11",
          A_MINOR,
          [
            { text: "Play the root.", expectedPitchClasses: [9] },
            { text: "Now play the flat 3rd.", expectedPitchClasses: [0] },
            { text: "Now play the 5th.", expectedPitchClasses: [4] },
          ],
          "Three chord tones in sequence",
        ),
        droneIdentify(
          "A",
          "A-11",
          [
            { label: "Chord tone (resolved)" },
            { label: "Not a chord tone" },
          ],
          (() => {
            const chordTones = [9, 0, 4];
            const nonChord = [11, 2, 5, 7]; // B, D, F, G
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const isChord = Math.random() < 0.5;
              out.push({
                key: A_MINOR,
                playedPitchClass: isChord
                  ? pickRandom(chordTones)
                  : pickRandom(nonChord),
                correctOptionIndex: isChord ? 0 : 1,
              });
            }
            return out;
          })(),
          "Chord tone vs. non-chord-tone",
        ),
      ];
    case "A-12":
      return [
        dronePlay("A", "A-12", A_MINOR, [
          { text: "Play the flat 7.", expectedPitchClasses: [7] },
        ]),
        dronePlay(
          "A",
          "A-12",
          A_MINOR,
          [
            {
              text: "Play any of the four: root, flat 3, 5, or flat 7.",
              expectedPitchClasses: [9, 0, 4, 7],
            },
          ],
          "Play any of the four blues notes",
        ),
        droneIdentify(
          "A",
          "A-12",
          [
            { label: "Root" },
            { label: "Flat 3rd" },
            { label: "5th" },
            { label: "Flat 7" },
          ],
          (() => {
            const map = [9, 0, 4, 7];
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const idx = Math.floor(Math.random() * 4);
              out.push({
                key: A_MINOR,
                playedPitchClass: map[idx]!,
                correctOptionIndex: idx,
              });
            }
            return out;
          })(),
          "Identify which of the four",
        ),
      ];
    case "A-13":
      return [
        droneIdentify(
          "A",
          "A-13",
          [{ label: "Chord tone" }, { label: "Passing tone (the 4)" }],
          (() => {
            const chordTones = [9, 0, 4, 7];
            const passing = [2];
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 6; i++) {
              const isChord = Math.random() < 0.5;
              out.push({
                key: A_MINOR,
                playedPitchClass: isChord
                  ? pickRandom(chordTones)
                  : pickRandom(passing),
                correctOptionIndex: isChord ? 0 : 1,
              });
            }
            return out;
          })(),
          "Chord tone vs. passing tone — pentatonic",
        ),
        dronePlay(
          "A",
          "A-13",
          A_MINOR,
          [
            {
              text: "Play any note from the A minor pentatonic.",
              expectedPitchClasses: [9, 0, 2, 4, 7],
            },
          ],
          "Any pentatonic note",
        ),
        dronePlay(
          "A",
          "A-13",
          A_MINOR,
          [
            { text: "Play any chord tone.", expectedPitchClasses: [9, 0, 4, 7] },
            { text: "Now play the 4 as a passing tone.", expectedPitchClasses: [2] },
            {
              text: "Now resolve to any chord tone.",
              expectedPitchClasses: [9, 0, 4, 7],
            },
          ],
          "Phrase: chord tone → passing → chord tone",
        ),
      ];
    case "A-14":
      // Two-chord vamp — recognition via simulated chord-change-identify.
      return [
        chordIdentify(
          "A-14",
          [{ label: "Am (i)" }, { label: "Dm (iv)" }],
          (() => {
            const prompts: CardTemplateParams["chord-change-identify"]["prompts"] =
              [];
            for (let i = 0; i < 4; i++) {
              const onAm = i % 2 === 0;
              prompts.push({
                keyLabel: "A minor — vamp",
                chords: onAm ? [CHORDS.Am!, CHORDS.Dm!] : [CHORDS.Dm!, CHORDS.Am!],
                askPositionIndex: 1,
                correctOptionIndex: onAm ? 0 : 1,
                transitionText: "Which chord is sounding right now?",
              });
            }
            return prompts;
          })(),
          "Am ↔ Dm vamp — which chord?",
        ),
        dronePlay(
          "A",
          "A-14",
          A_MINOR,
          [
            {
              text: "Play any chord tone of the chord currently playing (Am: A C E; Dm: D F A).",
              expectedPitchClasses: [9, 0, 4, 2, 5],
            },
          ],
          "Chord-tone targeting on a vamp",
          "Listen for which chord is under you and target its 1, 3, 5.",
        ),
      ];
    case "A-15":
      return [
        chordIdentify(
          "A-15",
          [
            { label: "I" },
            { label: "IV" },
            { label: "V" },
            { label: "vi" },
          ],
          [
            {
              keyLabel: "C major — I-vi-IV-V",
              chords: [CHORDS.C!, CHORDS.Am!, CHORDS.F!, CHORDS.G!],
              askPositionIndex: 2,
              correctOptionIndex: 3,
              transitionText: "Which function was the 2nd chord?",
            },
            {
              keyLabel: "C major — I-V-vi-IV",
              chords: [CHORDS.C!, CHORDS.G!, CHORDS.Am!, CHORDS.F!],
              askPositionIndex: 3,
              correctOptionIndex: 3,
              transitionText: "Which function was the 3rd chord?",
            },
            {
              keyLabel: "C major — I-IV-V-I",
              chords: [CHORDS.C!, CHORDS.F!, CHORDS.G!, CHORDS.C!],
              askPositionIndex: 3,
              correctOptionIndex: 2,
              transitionText: "Which function was the 3rd chord?",
            },
            {
              keyLabel: "C major — vi-IV-I-V",
              chords: [CHORDS.Am!, CHORDS.F!, CHORDS.C!, CHORDS.G!],
              askPositionIndex: 1,
              correctOptionIndex: 3,
              transitionText: "Which function was the 1st chord?",
            },
          ],
          "Identify chord tones over a I-IV-V-vi progression",
        ),
        dronePlay(
          "A",
          "A-15",
          C_MAJOR,
          [
            {
              text: "Play any chord tone of the chord currently playing (rotate over C → F → G → Am).",
              expectedPitchClasses: [0, 4, 7, 5, 9, 11, 2],
            },
          ],
          "Chord-tone targeting over the changes",
        ),
      ];
    case "A-16": {
      const KEYS: KeyContext[] = [
        { tonicMidi: 60, keyLabel: "C major", mode: "major" },
        { tonicMidi: 55, keyLabel: "G major", mode: "major" },
        { tonicMidi: 62, keyLabel: "D major", mode: "major" },
        { tonicMidi: 57, keyLabel: "A major", mode: "major" },
        { tonicMidi: 64, keyLabel: "E major", mode: "major" },
        { tonicMidi: 53, keyLabel: "F major", mode: "major" },
        { tonicMidi: 60, keyLabel: "C minor", mode: "minor" },
        { tonicMidi: 57, keyLabel: "A minor", mode: "minor" },
        { tonicMidi: 62, keyLabel: "D minor", mode: "minor" },
      ];
      const prompts: CardTemplateParams["drone-degree-identify"]["prompts"] = [];
      for (let i = 0; i < 6; i++) {
        const k = pickRandom(KEYS);
        const scale = k.mode === "major" ? DEGREES_MAJOR : DEGREES_MINOR;
        const idx = Math.floor(Math.random() * 7);
        prompts.push({
          key: k,
          playedPitchClass: pcDegree(k, scale[idx]!),
          correctOptionIndex: idx,
          transitionText: `Drone in ${k.keyLabel}.`,
        });
      }
      return [
        droneIdentify(
          "A",
          "A-16",
          SEVEN_DEGREE_BUTTONS,
          prompts,
          "Mixed-key degree identification",
          "Each prompt uses a random key. Identify the degree.",
        ),
      ];
    }

    // ─── Track B ────────────────────────────────────────────
    case "B-1":
      return [
        noteFinding("B-1", {
          pool: { notes: ["F", "G", "A", "B", "C", "D"], stringIndices: [5] },
          roundCount: 8,
        }),
      ];
    case "B-2":
      return [
        noteFinding("B-2", {
          pool: {
            notes: ["F", "G", "A", "B", "C", "D", "E"],
            stringIndices: [5, 4],
          },
          roundCount: 10,
        }),
      ];
    case "B-3":
      return [noteFinding("B-3", { noteName: "C", allStringsLowestFret: true })];
    case "B-4":
      return [noteFinding("B-4", { noteName: "F", allStringsLowestFret: true })];
    case "B-5":
      return [noteFinding("B-5", { noteName: "G", allStringsLowestFret: true })];
    case "B-6":
      return [
        noteFinding("B-6", { noteName: "D", allStringsLowestFret: true }),
        noteFinding("B-6", { noteName: "A", allStringsLowestFret: true }),
        noteFinding("B-6", {
          pool: { notes: ["D", "A"] },
          roundCount: 8,
        }),
      ];
    case "B-7":
      return [
        noteFinding("B-7", { noteName: "B", allStringsLowestFret: true }),
        noteFinding("B-7", { noteName: "F#", allStringsLowestFret: true }),
      ];
    case "B-8":
      return [
        noteFinding("B-8", {
          pool: { notes: ["C#", "D#", "F#", "G#", "A#"] },
          roundCount: 10,
        }),
      ];
    case "B-9":
      return [
        noteFinding("B-9", {
          pool: {
            notes: [
              "C",
              "C#",
              "D",
              "D#",
              "E",
              "F",
              "F#",
              "G",
              "G#",
              "A",
              "A#",
              "B",
            ],
          },
          roundCount: 12,
        }),
      ];
    case "B-10":
      return [
        noteFinding("B-10", {
          pool: {
            notes: [
              "C",
              "C#",
              "D",
              "D#",
              "E",
              "F",
              "F#",
              "G",
              "G#",
              "A",
              "A#",
              "B",
            ],
          },
          roundCount: 12,
          speedTimerSec: 2,
        }),
      ];

    // ─── Track C (revised: open → movable → pentatonic → CAGED) ────
    case "C-1": {
      const shape = SHAPES_BY_ID["open-c-major"]!;
      return [
        shapeRecall("C-1", {
          title: "C·1 · P1 — Play C major ascending",
          intro:
            "Play the eight notes in order. Wrong notes are ignored — keep playing until you find the next note in the shape.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-1", {
          title: "C·1 · P2 — Play C major descending",
          intro: "Same shape, top to bottom.",
          steps: shape.descending!,
          restartOnError: true,
        }),
      ];
    }
    case "C-2": {
      const shape = SHAPES_BY_ID["open-a-minor"]!;
      return [
        shapeRecall("C-2", {
          title: "C·2 · P1 — Play A minor ascending",
          intro:
            "Same notes as C major; centered on A. Open A → 2nd-fret A on the G string.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-2", {
          title: "C·2 · P2 — Play A minor descending",
          intro: "Reverse the shape.",
          steps: shape.descending!,
          restartOnError: true,
        }),
      ];
    }
    case "C-3": {
      const shape = SHAPES_BY_ID["movable-major-e-shape"]!;
      return [
        shapeRecall("C-3", {
          title: "C·3 · P1 — Movable major (E-shape) ascending in G",
          intro: "Root at 6/3. Slide the same shape for any major key later.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-3", {
          title: "C·3 · P2 — Movable major (E-shape) descending in G",
          intro: "Reverse direction; same shape.",
          steps: shape.descending!,
          restartOnError: true,
        }),
      ];
    }
    case "C-4": {
      const shape = SHAPES_BY_ID["movable-minor-e-shape"]!;
      return [
        shapeRecall("C-4", {
          title: "C·4 · P1 — Movable minor (E-shape) ascending in A minor",
          intro:
            "Root at 6/5. The 3rd, 6th, 7th drop a fret compared to major.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-4", {
          title: "C·4 · P2 — Movable minor (E-shape) descending in A minor",
          intro: "Reverse direction; same shape.",
          steps: shape.descending!,
          restartOnError: true,
        }),
      ];
    }
    case "C-5": {
      const shape = SHAPES_BY_ID["pent-box-1"]!;
      return [
        shapeRecall("C-5", {
          title: "C·5 · P1 — Play Box 1 ascending",
          intro: "12 notes, two per string. Wrong notes are ignored.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-5", {
          title: "C·5 · P2 — Play Box 1 descending",
          intro: "12 notes in reverse.",
          steps: shape.descending!,
          restartOnError: true,
        }),
      ];
    }
    case "C-6": {
      return [
        shapeRecall("C-6", {
          title: "C·6 · P1 — Play only the roots, low to high",
          intro: "Three A's inside Box 1: 6/5, 4/7, 1/5.",
          steps: SHAPES_BY_ID["pent-box-1-roots"]!.steps,
          restartOnError: true,
        }),
      ];
    }
    case "C-7": {
      return [
        shapeRecall("C-7", {
          title: "C·7 · P1 — Play only the flat 3rds",
          intro: "Three C's inside Box 1.",
          steps: [
            { stringIndex: 5, fret: 8 },
            { stringIndex: 2, fret: 5 },
            { stringIndex: 0, fret: 8 },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-7", {
          title: "C·7 · P2 — Play only the 5ths",
          intro: "Two E's inside Box 1.",
          steps: [
            { stringIndex: 4, fret: 7 },
            { stringIndex: 1, fret: 7 },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-7", {
          title: "C·7 · P3 — Roots → flat 3rds → 5ths",
          intro: "Capstone: all chord tones inside Box 1, in order.",
          steps: SHAPES_BY_ID["pent-box-1-chord-tones"]!.steps,
          restartOnError: true,
        }),
      ];
    }
    case "C-8": {
      const shape = SHAPES_BY_ID["caged-e-major"]!;
      return [
        shapeRecall("C-8", {
          title: "C·8 · P1 — E-shape major chord tones in G",
          intro:
            "G → D → G → B → D → G. Roots on 6/4/1, 3rd on 3, 5ths on 5/2.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-8", {
          title: "C·8 · P2 — Only the roots in E-shape G",
          intro: "Three G's: 6/3, 4/5, 1/3.",
          steps: [
            { stringIndex: 5, fret: 3 },
            { stringIndex: 3, fret: 5 },
            { stringIndex: 0, fret: 3 },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-8", {
          title: "C·8 · P3 — Only the 3rds in E-shape G",
          intro:
            "Find every 3rd in this shape — there's only one (B at 3/4).",
          steps: [{ stringIndex: 2, fret: 4 }],
          restartOnError: true,
        }),
      ];
    }
    case "C-9": {
      const shape = SHAPES_BY_ID["caged-e-minor"]!;
      return [
        shapeRecall("C-9", {
          title: "C·9 · P1 — E-shape minor chord tones in G minor",
          intro:
            "Same shape; 3rd flattens to flat 3rd. G → D → G → Bb → D → G.",
          steps: shape.steps,
          restartOnError: true,
        }),
      ];
    }
    case "C-10": {
      const shape = SHAPES_BY_ID["pent-box-2"]!;
      return [
        shapeRecall("C-10", {
          title: "C·10 · P1 — Play Box 2 ascending",
          intro: "12 notes, lowest is C (flat 3rd of A) at 6/8.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-10", {
          title: "C·10 · P2 — Play Box 2 descending",
          intro: "12 notes reversed.",
          steps: shape.descending!,
          restartOnError: true,
        }),
      ];
    }
    case "C-11": {
      return [
        shapeRecall("C-11", {
          title: "C·11 · P1 — Roots in Box 2",
          intro: "Two A's: D string fret 7, B string fret 10.",
          steps: [
            { stringIndex: 3, fret: 7 },
            { stringIndex: 1, fret: 10 },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-11", {
          title: "C·11 · P2 — Flat 3rds in Box 2",
          intro:
            "Three C's: low E fret 8, D string fret 10, high e fret 8.",
          steps: [
            { stringIndex: 5, fret: 8 },
            { stringIndex: 3, fret: 10 },
            { stringIndex: 0, fret: 8 },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-11", {
          title: "C·11 · P3 — 5ths in Box 2",
          intro: "Two E's: 5/7, 3/9.",
          steps: [
            { stringIndex: 4, fret: 7 },
            { stringIndex: 2, fret: 9 },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-11", {
          title: "C·11 · P4 — Roots → flat 3rds → 5ths in Box 2",
          intro: "Capstone: 7 notes covering every chord tone in Box 2.",
          steps: SHAPES_BY_ID["pent-box-2-chord-tones"]!.steps,
          restartOnError: true,
        }),
      ];
    }
    case "C-12": {
      const shape = SHAPES_BY_ID["caged-a-major"]!;
      return [
        shapeRecall("C-12", {
          title: "C·12 · P1 — A-shape major chord tones in C",
          intro: "Root → 3rd → 5th → root. C → E → G → C.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-12", {
          title: "C·12 · P2 — Only the roots in A-shape C",
          intro: "Two C's: 5/3, 2/5.",
          steps: [
            { stringIndex: 4, fret: 3 },
            { stringIndex: 1, fret: 5 },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-12", {
          title: "C·12 · P3 — Only the 3rds in A-shape C",
          intro: "Single note in this shape — E at 4/5.",
          steps: [{ stringIndex: 3, fret: 5 }],
          restartOnError: true,
        }),
      ];
    }
    case "C-13": {
      const shape = SHAPES_BY_ID["movable-major-a-shape"]!;
      return [
        shapeRecall("C-13", {
          title: "C·13 · P1 — A-shape major scale ascending in C",
          intro: "Root on the 5th string. 8 notes, one octave.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-13", {
          title: "C·13 · P2 — A-shape major scale descending in C",
          intro: "Reverse direction; same shape.",
          steps: shape.descending!,
          restartOnError: true,
        }),
      ];
    }
    case "C-14": {
      return [
        shapeRecall("C-14", {
          title: "C·14 · P1 — Walk Box 1 into Box 2 on the low E",
          intro: "A → C → D on the 6th string.",
          steps: [
            { stringIndex: 5, fret: 5 },
            { stringIndex: 5, fret: 8 },
            { stringIndex: 5, fret: 10 },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-14", {
          title: "C·14 · P2 — Walk across the boxes ascending",
          intro: "6-note line spanning Box 1 and Box 2.",
          steps: [
            { stringIndex: 5, fret: 5 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 4, fret: 7 },
            { stringIndex: 4, fret: 10 },
            { stringIndex: 3, fret: 7 },
            { stringIndex: 3, fret: 10 },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-14", {
          title: "C·14 · P3 — Capstone: full neck pentatonic run",
          intro: "13 notes across both boxes. Wrong notes are ignored.",
          steps: SHAPES_BY_ID["connect-box-1-2"]!.steps,
          restartOnError: true,
        }),
      ];
    }

    // ─── Track D ────────────────────────────────────────────
    case "D-1":
      return [
        chordIdentify(
          "D-1",
          [{ label: "I (C)" }, { label: "IV (F)" }, { label: "V (G)" }],
          [
            {
              keyLabel: "C major",
              chords: [CHORDS.C!, CHORDS.F!, CHORDS.C!],
              askPositionIndex: 2,
              correctOptionIndex: 1,
              transitionText: "Which function was the 2nd chord?",
            },
            {
              keyLabel: "C major",
              chords: [CHORDS.C!, CHORDS.G!, CHORDS.C!],
              askPositionIndex: 2,
              correctOptionIndex: 2,
              transitionText: "Which function was the 2nd chord?",
            },
            {
              keyLabel: "C major",
              chords: [CHORDS.C!, CHORDS.F!, CHORDS.G!, CHORDS.C!],
              askPositionIndex: 3,
              correctOptionIndex: 2,
              transitionText: "Which function was the 3rd chord?",
            },
            {
              keyLabel: "C major",
              chords: [CHORDS.C!, CHORDS.G!, CHORDS.F!, CHORDS.C!],
              askPositionIndex: 3,
              correctOptionIndex: 1,
              transitionText: "Which function was the 3rd chord?",
            },
          ],
        ),
        chordIdentify(
          "D-1",
          [{ label: "I" }, { label: "IV" }, { label: "V" }],
          [
            {
              keyLabel: "G major",
              chords: [CHORDS.G!, CHORDS.C!, CHORDS.D!],
              askPositionIndex: 3,
              correctOptionIndex: 2,
              transitionText: "Which function was the 3rd chord?",
            },
            {
              keyLabel: "D major",
              chords: [CHORDS.D!, CHORDS.G!, CHORDS.D!],
              askPositionIndex: 2,
              correctOptionIndex: 1,
              transitionText: "Which function was the 2nd chord?",
            },
          ],
        ),
      ];
    case "D-2":
      return [
        chordIdentify(
          "D-2",
          [
            { label: "I" },
            { label: "IV" },
            { label: "V" },
            { label: "vi" },
          ],
          [
            {
              keyLabel: "C major",
              chords: [CHORDS.C!, CHORDS.Am!, CHORDS.F!, CHORDS.G!],
              askPositionIndex: 2,
              correctOptionIndex: 3,
              transitionText: "Which was chord 2?",
            },
            {
              keyLabel: "C major",
              chords: [CHORDS.C!, CHORDS.G!, CHORDS.Am!, CHORDS.F!],
              askPositionIndex: 3,
              correctOptionIndex: 3,
              transitionText: "Which was chord 3? (the 'four chords of pop')",
            },
            {
              keyLabel: "C major",
              chords: [CHORDS.Am!, CHORDS.F!, CHORDS.C!, CHORDS.G!],
              askPositionIndex: 1,
              correctOptionIndex: 3,
              transitionText: "Which was chord 1?",
            },
            {
              keyLabel: "C major",
              chords: [CHORDS.C!, CHORDS.Am!, CHORDS.C!, CHORDS.F!],
              askPositionIndex: 4,
              correctOptionIndex: 1,
              transitionText: "Which was chord 4?",
            },
            {
              keyLabel: "C major",
              chords: [CHORDS.C!, CHORDS.G!, CHORDS.Am!, CHORDS.F!],
              askPositionIndex: 2,
              correctOptionIndex: 2,
              transitionText: "Which was chord 2?",
            },
          ],
        ),
      ];
    case "D-3":
      return [
        chordIdentify(
          "D-3",
          [
            { label: "I" },
            { label: "IV" },
            { label: "V" },
            { label: "vi" },
          ],
          [
            {
              keyLabel: "C major — I-V-vi-IV",
              chords: [CHORDS.C!, CHORDS.G!, CHORDS.Am!, CHORDS.F!],
              askPositionIndex: 3,
              correctOptionIndex: 3,
              transitionText: "Which was chord 3?",
            },
            {
              keyLabel: "C major — I-IV-V-I",
              chords: [CHORDS.C!, CHORDS.F!, CHORDS.G!, CHORDS.C!],
              askPositionIndex: 2,
              correctOptionIndex: 1,
              transitionText: "Which was chord 2?",
            },
            {
              keyLabel: "C major — I-vi-IV-V",
              chords: [CHORDS.C!, CHORDS.Am!, CHORDS.F!, CHORDS.G!],
              askPositionIndex: 4,
              correctOptionIndex: 2,
              transitionText: "Which was chord 4?",
            },
            {
              keyLabel: "C major — vi-IV-I-V",
              chords: [CHORDS.Am!, CHORDS.F!, CHORDS.C!, CHORDS.G!],
              askPositionIndex: 1,
              correctOptionIndex: 3,
              transitionText: "Which was chord 1?",
            },
            {
              keyLabel: "G major — I-V-vi-IV",
              chords: [CHORDS.G!, CHORDS.D!, CHORDS.Em!, CHORDS.C!],
              askPositionIndex: 2,
              correctOptionIndex: 2,
              transitionText: "Which was chord 2?",
            },
          ],
        ),
      ];
    case "D-4":
      return [
        chordIdentify(
          "D-4",
          [
            { label: "i" },
            { label: "iv" },
            { label: "v" },
            { label: "flat VII" },
            { label: "flat VI" },
          ],
          [
            {
              keyLabel: "A minor",
              chords: [CHORDS.Am!, CHORDS.Dm!, CHORDS.Am!, CHORDS.Em!],
              askPositionIndex: 2,
              correctOptionIndex: 1,
              transitionText: "Which was chord 2?",
            },
            {
              keyLabel: "A minor — i → flat VI → flat VII → i",
              chords: [CHORDS.Am!, CHORDS.F!, CHORDS.G!, CHORDS.Am!],
              askPositionIndex: 3,
              correctOptionIndex: 3,
              transitionText: "Which was chord 3?",
            },
            {
              keyLabel: "A minor — i → flat VII → i",
              chords: [CHORDS.Am!, CHORDS.G!, CHORDS.Am!],
              askPositionIndex: 2,
              correctOptionIndex: 3,
              transitionText: "Which was chord 2?",
            },
            {
              keyLabel: "A minor — i → flat VI → flat VII → i",
              chords: [CHORDS.Am!, CHORDS.F!, CHORDS.G!, CHORDS.Am!],
              askPositionIndex: 2,
              correctOptionIndex: 4,
              transitionText: "Which was chord 2?",
            },
          ],
        ),
      ];
    case "D-5":
      return [
        chordIdentify(
          "D-5",
          [
            { label: "I (or i)" },
            { label: "IV (or iv)" },
            { label: "V (or v)" },
            { label: "vi" },
            { label: "flat VII / flat VI" },
          ],
          [
            {
              keyLabel: "C — I-vi-IV-V (doo-wop)",
              chords: [CHORDS.C!, CHORDS.Am!, CHORDS.F!, CHORDS.G!],
              askPositionIndex: 4,
              correctOptionIndex: 2,
              transitionText: "Which was chord 4?",
            },
            {
              keyLabel: "G — I-V-vi-IV (four chords of pop)",
              chords: [CHORDS.G!, CHORDS.D!, CHORDS.Em!, CHORDS.C!],
              askPositionIndex: 3,
              correctOptionIndex: 3,
              transitionText: "Which was chord 3?",
            },
            {
              keyLabel: "Andalusian cadence — A minor",
              chords: [CHORDS.Am!, CHORDS.G!, CHORDS.F!, CHORDS.E!],
              askPositionIndex: 2,
              correctOptionIndex: 4,
              transitionText: "Which was chord 2?",
            },
            {
              keyLabel: "Pop-punk — D — I-V-vi-IV",
              chords: [CHORDS.D!, CHORDS.Am!, CHORDS.G!, CHORDS.D!],
              askPositionIndex: 2,
              correctOptionIndex: 2,
              transitionText: "Which was chord 2?",
            },
            {
              keyLabel: "12-bar simplified",
              chords: [CHORDS.C!, CHORDS.F!, CHORDS.G!, CHORDS.C!],
              askPositionIndex: 3,
              correctOptionIndex: 2,
              transitionText: "Which was chord 3?",
            },
          ],
        ),
      ];

    // ─── Track E ────────────────────────────────────────────
    case "E-1":
      return [
        intervalIdentify(
          "E-1",
          [{ label: "Major 2nd" }, { label: "Larger than a major 2nd" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            const larger = [4, 5, 7];
            for (let i = 0; i < 5; i++) {
              const isM2 = Math.random() < 0.5;
              const semi = isM2 ? 2 : pickRandom(larger);
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isM2 ? 0 : 1,
                actualLabel:
                  semi === 2
                    ? "major 2nd"
                    : semi === 4
                      ? "major 3rd"
                      : semi === 5
                        ? "perfect 4th"
                        : "perfect 5th",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-2":
      return [
        intervalIdentify(
          "E-2",
          [{ label: "Major 2nd" }, { label: "Major 3rd" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isM2 = Math.random() < 0.5;
              const semi = isM2 ? 2 : 4;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isM2 ? 0 : 1,
                actualLabel: isM2 ? "major 2nd" : "major 3rd",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-3":
      return [
        intervalIdentify(
          "E-3",
          [
            { label: "Major 2nd" },
            { label: "Major 3rd" },
            { label: "Perfect 4th" },
          ],
          (() => {
            const map = [2, 4, 5];
            const labels = ["major 2nd", "major 3rd", "perfect 4th"];
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const idx = Math.floor(Math.random() * 3);
              out.push({
                baseMidi: 60,
                semitones: map[idx]!,
                direction: "up",
                correctOptionIndex: idx,
                actualLabel: labels[idx]!,
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-4":
      return [
        intervalIdentify(
          "E-4",
          [{ label: "Major 3rd" }, { label: "Minor 3rd" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isMaj = Math.random() < 0.5;
              const semi = isMaj ? 4 : 3;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isMaj ? 0 : 1,
                actualLabel: isMaj ? "major 3rd" : "minor 3rd",
              });
            }
            return out;
          })(),
        ),
        intervalIdentify(
          "E-4",
          [
            { label: "Major 2nd" },
            { label: "Major 3rd" },
            { label: "Minor 3rd" },
            { label: "Perfect 4th" },
          ],
          (() => {
            const map = [2, 4, 3, 5];
            const labels = [
              "major 2nd",
              "major 3rd",
              "minor 3rd",
              "perfect 4th",
            ];
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const idx = Math.floor(Math.random() * 4);
              out.push({
                baseMidi: 60,
                semitones: map[idx]!,
                direction: "up",
                correctOptionIndex: idx,
                actualLabel: labels[idx]!,
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-5":
      return [
        intervalIdentify(
          "E-5",
          [
            { label: "Major 2nd" },
            { label: "Minor 3rd" },
            { label: "Major 3rd" },
            { label: "Perfect 4th" },
            { label: "Perfect 5th" },
          ],
          (() => {
            const map = [2, 3, 4, 5, 7];
            const labels = [
              "major 2nd",
              "minor 3rd",
              "major 3rd",
              "perfect 4th",
              "perfect 5th",
            ];
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const idx = Math.floor(Math.random() * 5);
              out.push({
                baseMidi: 60,
                semitones: map[idx]!,
                direction: "up",
                correctOptionIndex: idx,
                actualLabel: labels[idx]!,
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-6":
      return [
        intervalIdentify(
          "E-6",
          [
            { label: "Major 2nd" },
            { label: "Minor 3rd" },
            { label: "Major 3rd" },
            { label: "Perfect 4th" },
            { label: "Perfect 5th" },
            { label: "Minor 7th" },
          ],
          (() => {
            const map = [2, 3, 4, 5, 7, 10];
            const labels = [
              "major 2nd",
              "minor 3rd",
              "major 3rd",
              "perfect 4th",
              "perfect 5th",
              "minor 7th",
            ];
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const idx = Math.floor(Math.random() * 6);
              out.push({
                baseMidi: 60,
                semitones: map[idx]!,
                direction: "up",
                correctOptionIndex: idx,
                actualLabel: labels[idx]!,
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-7":
      return [
        intervalIdentify(
          "E-7",
          [
            { label: "Major 2nd" },
            { label: "Minor 3rd" },
            { label: "Major 3rd" },
            { label: "Perfect 4th" },
            { label: "Perfect 5th" },
            { label: "Minor 7th" },
          ],
          (() => {
            const map = [2, 3, 4, 5, 7, 10];
            const labels = [
              "major 2nd",
              "minor 3rd",
              "major 3rd",
              "perfect 4th",
              "perfect 5th",
              "minor 7th",
            ];
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const idx = Math.floor(Math.random() * 6);
              out.push({
                baseMidi: 72,
                semitones: map[idx]!,
                direction: "down",
                correctOptionIndex: idx,
                actualLabel: labels[idx]!,
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-8":
      return [
        intervalIdentify(
          "E-8",
          [
            { label: "Major 2nd" },
            { label: "Minor 3rd" },
            { label: "Major 3rd" },
            { label: "Perfect 4th" },
            { label: "Perfect 5th" },
            { label: "Minor 7th" },
          ],
          (() => {
            const map = [2, 3, 4, 5, 7, 10];
            const labels = [
              "major 2nd",
              "minor 3rd",
              "major 3rd",
              "perfect 4th",
              "perfect 5th",
              "minor 7th",
            ];
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 6; i++) {
              const idx = Math.floor(Math.random() * 6);
              const dir = Math.random() < 0.5 ? "up" : "down";
              out.push({
                baseMidi: dir === "up" ? 60 : 72,
                semitones: map[idx]!,
                direction: dir,
                correctOptionIndex: idx,
                actualLabel: labels[idx]!,
              });
            }
            return out;
          })(),
        ),
      ];
    default:
      return [];
  }
}

// Re-export utility shapes for other modules / tests.
export { intervalPlay };
