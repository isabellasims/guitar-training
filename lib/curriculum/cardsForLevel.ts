import type {
  BuiltCard,
  CardTemplateId,
  CardTemplateParams,
  KeyContext,
} from "@/lib/cards/types";
import type { TrackId } from "@/lib/domain/types";
import { SHAPES_BY_ID } from "@/lib/curriculum/shapeLibrary";
import { getLevel } from "@/lib/curriculum/levels";
import { chord as buildChord } from "@/lib/music/chords";
import {
  pickSeeded,
  seededChance,
  seededIndex,
} from "@/lib/curriculum/seededRandom";

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
const G_MAJOR: KeyContext = { tonicMidi: 55, keyLabel: "G major", mode: "major" };
const D_MAJOR: KeyContext = { tonicMidi: 62, keyLabel: "D major", mode: "major" };
const A_MINOR: KeyContext = { tonicMidi: 57, keyLabel: "A minor", mode: "minor" };
const E_MINOR: KeyContext = { tonicMidi: 64, keyLabel: "E minor", mode: "minor" };
const D_MINOR: KeyContext = { tonicMidi: 62, keyLabel: "D minor", mode: "minor" };
const C_MINOR_LABEL: KeyContext = {
  tonicMidi: 60,
  keyLabel: "C minor",
  mode: "minor",
};

function uid(): string {
  return crypto.randomUUID();
}

/**
 * Prepended before `chord-change-identify` drills so sessions replay the
 * lesson progression. Skipped in quick (1-card) sessions — see `pickPractice`
 * in `buildSession.ts`.
 */
export const CHORD_DRILL_PREFLIGHT_CONTINUE = "Continue to chord drills";

export function isChordDrillPreflightCard(b: BuiltCard): boolean {
  if (b.templateId !== "concept-explainer" || b.trackId !== "D") {
    return false;
  }
  const p = b.parameters as { continueLabel?: string };
  return p.continueLabel === CHORD_DRILL_PREFLIGHT_CONTINUE;
}

function chordDrillPreflight(levelId: string) {
  switch (levelId) {
    case "D-1":
      return card("concept-explainer", "D", "D-1", {
        title: "Hear the changes first",
        body: [
          "Replay how I, IV, and V move in C — same progression as the lesson — then continue into the drills.",
        ],
        chordProgressionListen: {
          label: "Hear C → F → C → G → C",
          chords: [CHORDS.C!, CHORDS.F!, CHORDS.C!, CHORDS.G!, CHORDS.C!],
        },
        continueLabel: CHORD_DRILL_PREFLIGHT_CONTINUE,
      });
    case "D-2":
      return card("concept-explainer", "D", "D-2", {
        title: "Hear the changes first",
        body: [
          "Replay the I–V–vi–IV loop in C before you pick chord functions.",
        ],
        chordProgressionListen: {
          label: "Hear I-V-vi-IV in C",
          chords: [CHORDS.C!, CHORDS.G!, CHORDS.Am!, CHORDS.F!],
        },
        continueLabel: CHORD_DRILL_PREFLIGHT_CONTINUE,
      });
    case "D-3":
      return card("concept-explainer", "D", "D-3", {
        title: "Hear the changes first",
        body: [
          "Replay ii-V-I in C — the move you just learned — before drilling recognition with the new ii option in the mix.",
        ],
        chordProgressionListen: {
          label: "Hear ii-V-I in C",
          chords: [CHORDS.Dm!, CHORDS.G!, CHORDS.C!],
        },
        continueLabel: CHORD_DRILL_PREFLIGHT_CONTINUE,
      });
    case "D-4":
      return card("concept-explainer", "D", "D-4", {
        title: "Hear the changes first",
        body: [
          "Replay the minor-key vamp from the lesson (A minor with the flat VII move), then continue into the drills.",
        ],
        chordProgressionListen: {
          label: "Hear i → flat VII → i in A minor",
          chords: [CHORDS.Am!, CHORDS.G!, CHORDS.Am!],
        },
        continueLabel: CHORD_DRILL_PREFLIGHT_CONTINUE,
      });
    case "D-5":
      return card("concept-explainer", "D", "D-5", {
        title: "Hear the changes first",
        body: [
          "Replay a short progression in C (I–IV–V–I) to warm your ear, then tackle the mixed-style drills.",
        ],
        chordProgressionListen: {
          label: "Hear C → F → G → C",
          chords: [CHORDS.C!, CHORDS.F!, CHORDS.G!, CHORDS.C!],
        },
        continueLabel: CHORD_DRILL_PREFLIGHT_CONTINUE,
      });
    default:
      return null;
  }
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
// Triad math lives in `lib/music/chords.ts` so the curriculum and the new
// Chord Explorer share one source of truth.
const CHORDS: Record<string, number[]> = {
  C: buildChord("C", "M"),
  F: buildChord("F", "M"),
  G: buildChord("G", "M"),
  Am: buildChord("A", "m"),
  Dm: buildChord("D", "m"),
  Em: buildChord("E", "m"),
  E: buildChord("E", "M"),
  D: buildChord("D", "M"),
  A: buildChord("A", "M"),
  Bm: buildChord("B", "m"),
};

// ───── helpers for randomized recognition prompts ──────────────────────────
function pickRandom<T>(pool: readonly T[], seed: string): T {
  return pickSeeded(pool, seed);
}

function pcDegree(key: KeyContext, degreeIntervalSemitones: number): number {
  return (((key.tonicMidi + degreeIntervalSemitones) % 12) + 12) % 12;
}

const DEGREES_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DEGREES_MINOR = [0, 2, 3, 5, 7, 8, 10];

// ───── concept-explainer cards ─────────────────────────────────────────────
export function explainerForLevel(levelId: string): BuiltCard | null {
  switch (levelId) {
    // ─── Track A — Phase 1 (Major) ────────────────────────────────────
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
          "Drone in C and listen until the home pitch feels obvious. Hum along if it helps — you do not need to play C over the drone (the mic cannot tell your guitar apart from the tonic).",
          "This is degree 1 — the foundation of every other degree you'll learn. Practice finding C on the fretboard in the cards that follow.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        continueLabel: "Got it",
      });
    case "A-3":
      return card("concept-explainer", "A", "A-3", {
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
    case "A-4":
      return card("concept-explainer", "A", "A-4", {
        title: "The 3rd — color of major",
        terms: [
          {
            term: "Major third",
            definition:
              "Two whole steps above the tonic. The bright color of major.",
          },
        ],
        body: [
          "E over a C drone is the 3rd. It's the note that makes C sound major — the bright, sweet color of the key.",
          "Move root → 3rd → 5th. Hear the major triad emerge. The 3rd is what makes the difference: keep it bright (E) for major, drop it a fret (Eb) for minor.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        customListen: {
          label: "Hear root, 3rd, 5th",
          sequence: [60, 64, 67, 60],
          noteDurationSec: 0.55,
        },
        continueLabel: "Got it",
      });
    case "A-6":
      return card("concept-explainer", "A", "A-6", {
        title: "The 7th — pulls toward home",
        body: [
          "Over a C drone, B is the 7th. It's restless — wants to slip up to C. The leading tone of major.",
          "Listen for the half-step pull: 7 → 1. That tiny upward step is why melodies feel resolved when they land on the root.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        customListen: {
          label: "Hear 7 → 1 (B → C)",
          sequence: [71, 72],
          noteDurationSec: 0.85,
        },
        continueLabel: "Got it",
      });
    case "A-7":
      return card("concept-explainer", "A", "A-7", {
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
          "In minor (the flat 6), it's darker and heavier. You'll meet that flavor in Phase 2.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        continueLabel: "Got it",
      });
    // ─── Track A — Phase 2 (Minor) ────────────────────────────────────
    case "A-12":
      return card("concept-explainer", "A", "A-12", {
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
          "Open-position A natural minor (one octave): 5th string open (A) → 2nd fret (B) → 3rd fret (C); 4th string open (D) → 2nd fret (E) → 3rd fret (F); 3rd string open (G) → 2nd fret (A). Same notes as C major, centered on A.",
          "Hum or play A wherever feels like home while the drone runs.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
        scaleListen: { tonicMidi: A_MINOR.tonicMidi, mode: "minor" },
        continueLabel: "Got it",
      });
    case "A-14":
      return card("concept-explainer", "A", "A-14", {
        title: "The Flat 3rd — color of minor",
        terms: [
          {
            term: "Flat 3rd",
            definition:
              "Three half-steps above the tonic. The defining color of a minor key.",
          },
        ],
        body: [
          "Over an A minor drone, C is the flat 3rd. Compare it to E (the major 3rd of A): C is darker, more inward.",
          "The flat 3rd is what makes minor sound minor. Move 1 → b3 → 5 and feel the minor triad land.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
        customListen: {
          label: "Hear 1 → b3 → 5 in A minor",
          sequence: [57, 60, 64, 57],
          noteDurationSec: 0.55,
        },
        continueLabel: "Got it",
      });
    case "A-15":
      return card("concept-explainer", "A", "A-15", {
        title: "The Flat 7 — bluesy, modal",
        body: [
          "Over A minor, G is the flat 7. Doesn't lead into the root like a major 7 does — it just sits, dominant and unresolved.",
          "Add it to root / flat 3 / 5 and you've got the four notes of minor-pentatonic chord-tone territory. The blues lives here.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
        customListen: {
          label: "Hear the four blues notes (1, b3, 5, b7)",
          sequence: [57, 60, 64, 67],
          noteDurationSec: 0.55,
        },
        continueLabel: "Got it",
      });
    case "A-16":
      return card("concept-explainer", "A", "A-16", {
        title: "The Flat 6 and the 2 — minor color tones",
        body: [
          "Two more pitches finish A natural minor: F (flat 6) and B (the 2).",
          "Flat 6 is heavy, melancholy — pulls strongly down to the 5. The 2 is light and step-wise, a passing tone between root and flat 3.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
        customListen: {
          label: "Hear b6 → 5 and 2 → b3 in A minor",
          sequence: [65, 64, 59, 60],
          noteDurationSec: 0.6,
        },
        continueLabel: "Got it",
      });
    // ─── Track A — Phase 3 (Cross-key) ────────────────────────────────
    case "A-19":
      return card("concept-explainer", "A", "A-19", {
        title: "Same degrees, different keys — G and D major",
        terms: [
          {
            term: "Transposition",
            definition:
              "Playing the same musical idea in a different key. The degrees stay the same — the pitches change.",
          },
        ],
        body: [
          "Up to now everything has been in C major (or A minor). Now we move home: G major, then D major.",
          "The point: degree-by-ear must survive a key change. The 'home' pitch is different, but the 3rd is still the 3rd, the 5th is still the 5th.",
        ],
        droneTonicMidi: G_MAJOR.tonicMidi,
        droneKeyLabel: G_MAJOR.keyLabel,
        scaleListen: { tonicMidi: G_MAJOR.tonicMidi, mode: "major" },
        continueLabel: "Got it",
      });
    case "A-21":
      return card("concept-explainer", "A", "A-21", {
        title: "Minor keys move too — E and D minor",
        body: [
          "Same idea, dark side: hear the flat 3rd, flat 6, flat 7 against E (then D) as home.",
          "Resist transposing the lesson back to A minor in your head. Let G♯ stop sounding like 'home' in E and let D be home in D minor.",
        ],
        droneTonicMidi: E_MINOR.tonicMidi,
        droneKeyLabel: E_MINOR.keyLabel,
        scaleListen: { tonicMidi: E_MINOR.tonicMidi, mode: "minor" },
        continueLabel: "Got it",
      });
    // ─── Track B ──────────────────────────────────────────────────────
    case "B-1":
      return card("concept-explainer", "B", "B-1", {
        title: "Solidify the low E string",
        body: [
          "Track B is pure fretboard recall — separate from ear training, but it makes everything you hear in Track A land faster.",
          "First foothold: the 6th string (low E). Learn every natural note on this string, including open E.",
        ],
        continueLabel: "Got it",
      });
    case "B-2":
      return card("concept-explainer", "B", "B-2", {
        title: "Own the A string",
        body: [
          "Same job as low E, one string closer to the floor: random naturals on the 5th string only.",
          "When this feels easy, the next level mixes low E and A so you learn which string you're on.",
        ],
        continueLabel: "Got it",
      });
    case "B-4":
      return card("concept-explainer", "B", "B-4", {
        title: "The D string",
        body: [
          "Work outward from the strings you know: the 4th string (D) is next.",
          "Same drill — find random naturals on this string only before we connect notes across the neck.",
        ],
        continueLabel: "Got it",
      });
    case "B-6":
      return card("concept-explainer", "B", "B-6", {
        title: "The second string (called B)",
        body: [
          "Guitar strings are named E, A, D, G, B, e. This level is the thin B string — not the note B.",
          "Random naturals on the 2nd string only.",
        ],
        continueLabel: "Got it",
      });
    case "B-8":
      return card("concept-explainer", "B", "B-8", {
        title: "C everywhere on the neck",
        body: [
          "You've mapped each string. Now one note at a time across all six: same letter, six locations.",
          "Circle-of-fifths order from here: C → G → D → A → E → F → B (the note). Each level adds one pitch class across the whole fretboard.",
        ],
        continueLabel: "Got it",
      });
    case "B-15":
      return card("concept-explainer", "B", "B-15", {
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
          "You know every natural note across the neck. Now we add the sharps and flats. The fretboard fills in.",
        ],
        continueLabel: "Got it",
      });
    // ─── Track C (unchanged 14 levels) ────────────────────────────────
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
          steps: SHAPES_BY_ID["open-a-minor"]!.steps,
        },
        continueLabel: "Got it",
      });
    case "C-3": {
      const c3 = SHAPES_BY_ID["movable-major-e-shape"]!;
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
          "Open scales only work in one key. Movable scales work in every key — same fingering, slid to wherever you want home to be.",
          "This is the standard Position 1 major scale: 15 notes across two octaves, four fingers, six strings. The root sits under your middle finger (finger 2) on the 6th string. Wherever it lands, that's the major key you're playing in.",
          "We'll start in G major, with the root on the 3rd fret of the 6th string. The shape stays identical for any other key — only the hand position moves. Flip the toggle below the diagram to Fingers to see the pattern; flip to Degrees to see the structure.",
        ],
        scaleListen: { tonicMidi: 55, mode: "major" },
        fretboardShape: {
          title: "Position 1 major (E-shape) — G major, root at 6/3.",
          maxFret: 7,
          steps: c3.steps,
          defaultLabelMode: "fingers",
        },
        continueLabel: "Got it",
      });
    }
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
          defaultLabelMode: "fingers",
          steps: [
            { stringIndex: 5, fret: 5, finger: 1, degree: "1" },
            { stringIndex: 5, fret: 8, finger: 4, degree: "b3" },
            { stringIndex: 4, fret: 5, finger: 1, degree: "4" },
            { stringIndex: 4, fret: 7, finger: 3, degree: "5" },
            { stringIndex: 3, fret: 5, finger: 1, degree: "b7" },
            { stringIndex: 3, fret: 7, finger: 3, degree: "1" },
            { stringIndex: 2, fret: 5, finger: 1, degree: "b3" },
            { stringIndex: 2, fret: 7, finger: 3, degree: "4" },
            { stringIndex: 1, fret: 5, finger: 1, degree: "5" },
            { stringIndex: 1, fret: 8, finger: 4, degree: "b7" },
            { stringIndex: 0, fret: 5, finger: 1, degree: "1" },
            { stringIndex: 0, fret: 8, finger: 4, degree: "b3" },
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
          defaultLabelMode: "notes",
          steps: [
            { stringIndex: 5, fret: 5, finger: 1, degree: "1" },
            { stringIndex: 3, fret: 7, finger: 3, degree: "1" },
            { stringIndex: 0, fret: 5, finger: 1, degree: "1" },
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
          "Roots: 6/5, 4/7, 1/5. Flat 3rds: 6/8, 3/5, 1/8. Fifths: 5/7, 2/5.",
        ],
        fretboardShape: {
          title: "Box 1 — chord tones (roots, flat 3rds, 5ths) highlighted.",
          maxFret: 9,
          defaultLabelMode: "degrees",
          steps: [
            { stringIndex: 5, fret: 5, finger: 1, degree: "1" },
            { stringIndex: 3, fret: 7, finger: 3, degree: "1" },
            { stringIndex: 0, fret: 5, finger: 1, degree: "1" },
            { stringIndex: 5, fret: 8, finger: 4, degree: "b3" },
            { stringIndex: 2, fret: 5, finger: 1, degree: "b3" },
            { stringIndex: 0, fret: 8, finger: 4, degree: "b3" },
            { stringIndex: 4, fret: 7, finger: 3, degree: "5" },
            { stringIndex: 1, fret: 5, finger: 1, degree: "5" },
          ],
        },
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
          defaultLabelMode: "fingers",
          steps: [
            { stringIndex: 5, fret: 8, finger: 2, degree: "b3" },
            { stringIndex: 5, fret: 10, finger: 4, degree: "4" },
            { stringIndex: 4, fret: 7, finger: 1, degree: "5" },
            { stringIndex: 4, fret: 10, finger: 4, degree: "b7" },
            { stringIndex: 3, fret: 7, finger: 1, degree: "1" },
            { stringIndex: 3, fret: 10, finger: 4, degree: "b3" },
            { stringIndex: 2, fret: 7, finger: 1, degree: "4" },
            { stringIndex: 2, fret: 9, finger: 3, degree: "5" },
            { stringIndex: 1, fret: 8, finger: 2, degree: "b7" },
            { stringIndex: 1, fret: 10, finger: 4, degree: "1" },
            { stringIndex: 0, fret: 8, finger: 2, degree: "b3" },
            { stringIndex: 0, fret: 10, finger: 4, degree: "4" },
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
        fretboardShape: {
          title: "Box 2 — chord tones (roots, flat 3rds, 5ths) highlighted.",
          maxFret: 11,
          defaultLabelMode: "degrees",
          steps: [
            { stringIndex: 3, fret: 7, finger: 1, degree: "1" },
            { stringIndex: 1, fret: 10, finger: 4, degree: "1" },
            { stringIndex: 5, fret: 8, finger: 2, degree: "b3" },
            { stringIndex: 3, fret: 10, finger: 4, degree: "b3" },
            { stringIndex: 0, fret: 8, finger: 2, degree: "b3" },
            { stringIndex: 4, fret: 7, finger: 1, degree: "5" },
            { stringIndex: 2, fret: 9, finger: 3, degree: "5" },
          ],
        },
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
          defaultLabelMode: "notes",
          steps: [
            { stringIndex: 5, fret: 5, degree: "1" },
            { stringIndex: 5, fret: 8, degree: "b3" },
            { stringIndex: 5, fret: 10, degree: "4" },
            { stringIndex: 4, fret: 5, degree: "4" },
            { stringIndex: 4, fret: 7, degree: "5" },
            { stringIndex: 4, fret: 10, degree: "b7" },
            { stringIndex: 3, fret: 5, degree: "b7" },
            { stringIndex: 3, fret: 7, degree: "1" },
            { stringIndex: 3, fret: 10, degree: "b3" },
            { stringIndex: 2, fret: 5, degree: "b3" },
            { stringIndex: 2, fret: 7, degree: "4" },
            { stringIndex: 2, fret: 9, degree: "5" },
            { stringIndex: 1, fret: 5, degree: "5" },
            { stringIndex: 1, fret: 8, degree: "b7" },
            { stringIndex: 1, fret: 10, degree: "1" },
            { stringIndex: 0, fret: 5, degree: "1" },
            { stringIndex: 0, fret: 8, degree: "b3" },
            { stringIndex: 0, fret: 10, degree: "4" },
          ],
        },
        continueLabel: "Got it",
      });
    // ─── Track D ──────────────────────────────────────────────────────
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
    case "D-3":
      return card("concept-explainer", "D", "D-3", {
        title: "ii — the pre-dominant",
        body: [
          "The ii chord is minor. In C major, ii is Dm. It sits between IV and V in function — sets up the V which sets up the I.",
          "ii → V → I is the most common move in jazz and shows up constantly in pop. Once you hear it, you'll hear it everywhere.",
        ],
        chordProgressionListen: {
          label: "Hear ii-V-I in C",
          chords: [CHORDS.Dm!, CHORDS.G!, CHORDS.C!],
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
    // ─── Track E ──────────────────────────────────────────────────────
    case "E-1":
      return card("concept-explainer", "E", "E-1", {
        title: "Perfect 5th — open and hovering",
        body: [
          "Seven semitones. The power-chord sound. Open, stable, but not 'home' — it floats above the root.",
          "'Twinkle Twinkle' opens with a perfect 5th up. So does the Star Wars theme.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 67],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-2":
      return card("concept-explainer", "E", "E-2", {
        title: "Perfect 4th — anchored, leaning",
        body: [
          "Five semitones. Strong, anchored — leans on the 5th above it. 'Here Comes the Bride' opens with a perfect 4th up.",
          "On guitar, a perfect 4th is the move from one fret on one string to the same fret on the next string — except between G and B, which is a major 3rd.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 65],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-3":
      return card("concept-explainer", "E", "E-3", {
        title: "Major 3rd — bright color",
        body: [
          "Four semitones. The bright color of a major chord — the 'sweet' interval.",
          "The opening of 'Oh When the Saints' is a major 3rd up. Warm and resolved.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 64],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-5":
      return card("concept-explainer", "E", "E-5", {
        title: "Major 2nd — small step, light tension",
        body: [
          "Two semitones. The first two notes of 'Happy Birthday' are a major 2nd up.",
          "Tense but small — wants to keep moving. The basic step of a major scale.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 62],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-6":
      return card("concept-explainer", "E", "E-6", {
        title: "Major 6th — wistful, bright",
        body: [
          "Nine semitones. Bright but with a hint of longing — the 'NBC chimes' interval (G→E).",
          "Larger than the major 3rd, but still consonant. Sounds resolved-ish.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 69],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-7":
      return card("concept-explainer", "E", "E-7", {
        title: "Major 7th — restless, sharp tension",
        body: [
          "Eleven semitones. Sharply tense — wants to slip up to the octave (just one fret away).",
          "If you sing 'There's a Place For Us' (West Side Story), the leap on 'place' is a major 7th up.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 71],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-9":
      return card("concept-explainer", "E", "E-9", {
        title: "Minor 3rd — dark color",
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
    case "E-10":
      return card("concept-explainer", "E", "E-10", {
        title: "Minor 7th — bluesy, dominant",
        body: [
          "Ten semitones. The bluesy flat 7 against the root. Dominant, unresolved.",
          "Used everywhere in blues and Mayer-style minor playing. The 'Star Trek theme' opens with a minor 7th up.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 70],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-11":
      return card("concept-explainer", "E", "E-11", {
        title: "Minor 6th — melancholy, heavy",
        body: [
          "Eight semitones. The 'longing' interval. Dark, more inward than its major sibling.",
          "Sing the opening of 'The Entertainer' bridge or 'Black Orpheus' theme — minor 6ths show up everywhere in melancholy melodies.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 68],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-12":
      return card("concept-explainer", "E", "E-12", {
        title: "Minor 2nd — half-step, biting",
        body: [
          "One semitone. The smallest interval, the most-tense. The 'Jaws theme' lives entirely on a repeated minor 2nd.",
          "When the leading tone (7) resolves up to the root (1), that's a minor 2nd.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 61],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-13":
      return card("concept-explainer", "E", "E-13", {
        title: "Tritone — the devil's interval",
        body: [
          "Six semitones. Exactly half an octave — neither a 4th nor a 5th. Sounds unstable in any context.",
          "The opening of 'Maria' from West Side Story is a tritone up. Listen for the 'ambiguous, suspended' character.",
        ],
        customListen: {
          label: "Hear the interval",
          sequence: [60, 66],
          noteDurationSec: 0.7,
        },
        continueLabel: "Got it",
      });
    case "E-15":
      return card("concept-explainer", "E", "E-15", {
        title: "Same intervals, played downward",
        body: [
          "We've drilled intervals ascending. Now we flip: same distances, but the second note is below the first.",
          "Most ears find descending intervals slightly harder at first. Don't panic if your accuracy dips — we start with the most consonant anchors (P5, P4, M3, m3) before moving to the rest.",
        ],
        continueLabel: "Got it",
      });
    case "E-16":
      return card("concept-explainer", "E", "E-16", {
        title: "Descending — the remaining intervals",
        body: [
          "Add the descending versions of the smaller and more dissonant intervals: M2, m2, M6, m6, M7, m7, tritone.",
          "Once these click, you can hear any interval regardless of direction.",
        ],
        continueLabel: "Got it",
      });
    // ─── Track F ──────────────────────────────────────────────────────
    case "F-1":
      return card("concept-explainer", "F", "F-1", {
        title: "Chord tones of a major chord",
        terms: [
          {
            term: "Chord tone",
            definition:
              "A note that belongs to the chord currently playing. For a major chord, that's the root, the major 3rd, and the 5th.",
          },
        ],
        body: [
          "Phrases that land on chord tones sound resolved. Phrases that land elsewhere sound like they're passing through.",
          "Over a C drone, the chord tones of a C major chord are C (root), E (3rd), G (5th). Three notes — your home base for soloing in major.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        customListen: {
          label: "Hear C, E, G",
          sequence: [60, 64, 67, 72],
          noteDurationSec: 0.55,
        },
        continueLabel: "Got it",
      });
    case "F-2":
      return card("concept-explainer", "F", "F-2", {
        title: "Chord tones of a minor chord",
        body: [
          "Same idea, dark color: root, flat 3rd, 5th. In A minor: A, C, E.",
          "Land on these three notes and every minor groove sounds resolved. Land elsewhere and you're in motion.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
        customListen: {
          label: "Hear A, C, E",
          sequence: [57, 60, 64, 69],
          noteDurationSec: 0.55,
        },
        continueLabel: "Got it",
      });
    default:
      return null;
  }
}

// ───── practice cards ──────────────────────────────────────────────────────
// ─── Identify-card button sets ────────────────────────────────────────────
// CORE RULE — never violated by any drone-degree-identify card:
//   The tonic is *playing under the prompt* (that's literally what the
//   drone is). Asking "is this the root or the 5th?" is pitch-matching to
//   the drone, not functional ear training. Every option pool below
//   excludes the root, and every helper that samples a played pitch
//   class skips degree 1 of the active key. Do not ask the user to *play*
//   the root over a tonic drone — pitch detection locks onto the drone.
//   Finding the root on the neck uses note-finding cards (no drone).
const THREE_VS_FIVE_MAJOR: Array<{ label: string }> = [
  { label: "The 3rd (bright)" },
  { label: "The 5th (hovering)" },
];
const FLAT_THREE_VS_FIVE: Array<{ label: string }> = [
  { label: "The flat 3rd" },
  { label: "The 5th" },
];
const SIX_DEGREE_BUTTONS_MAJOR: Array<{ label: string }> = [
  { label: "2" },
  { label: "3" },
  { label: "4" },
  { label: "5" },
  { label: "6" },
  { label: "7" },
];
const SIX_DEGREE_BUTTONS_MINOR: Array<{ label: string }> = [
  { label: "2" },
  { label: "b3" },
  { label: "4" },
  { label: "5" },
  { label: "b6" },
  { label: "b7" },
];

/**
 * Pick the hint-toggle emphasis for a level based on its track + numeric
 * level. Early Track B levels emphasize the toggle so the safety net is
 * obvious; late levels de-emphasize it because the user is expected to
 * know the answer.
 */
function hintEmphasisForLevel(
  trackId: TrackId,
  levelId: string,
): "default" | "subtle" | "emphasized" {
  const lvl = getLevel(levelId);
  const n = lvl?.level;
  if (trackId === "B") {
    if (n != null && n <= 7) return "emphasized";
    if (n != null && n >= 16) return "subtle";
  }
  return "default";
}

function dronePlay(
  trackId: TrackId,
  levelId: string,
  key: KeyContext,
  prompts: CardTemplateParams["drone-degree-play"]["prompts"],
  uiTitle?: string,
  uiDescription?: string,
): BuiltCard<"drone-degree-play"> {
  const tonicPc = ((key.tonicMidi % 12) + 12) % 12;
  const filtered = prompts.filter((p) =>
    p.expectedPitchClasses.some(
      (pc) => (((pc % 12) + 12) % 12) !== tonicPc,
    ),
  );
  return card("drone-degree-play", trackId, levelId, {
    keyLabel: key.keyLabel,
    tonicMidi: key.tonicMidi,
    mode: key.mode,
    prompts: filtered,
    uiTitle,
    uiDescription,
    hintEmphasis: hintEmphasisForLevel(trackId, levelId),
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
  trackId: TrackId,
  levelId: string,
  params: CardTemplateParams["note-finding-play"],
): BuiltCard<"note-finding-play"> {
  return card("note-finding-play", trackId, levelId, {
    ...params,
    hintEmphasis:
      params.hintEmphasis ?? hintEmphasisForLevel(trackId, levelId),
  });
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

/**
 * Stable-tone identify in MAJOR: 3rd vs. 5th. Never the root — see CORE
 * RULE above.
 */
function stableTonesPromptsMajor(
  key: KeyContext,
  count: number,
  seedPrefix: string,
): CardTemplateParams["drone-degree-identify"]["prompts"] {
  const out: CardTemplateParams["drone-degree-identify"]["prompts"] = [];
  for (let i = 0; i < count; i++) {
    const isThird = seededChance(`${seedPrefix}:maj-3v5:${i}`);
    out.push({
      key,
      playedPitchClass: isThird ? pcDegree(key, 4) : pcDegree(key, 7),
      correctOptionIndex: isThird ? 0 : 1,
    });
  }
  return out;
}

/** Stable-tone identify in MINOR: flat 3rd vs. 5th. */
function stableTonesPromptsMinor(
  key: KeyContext,
  count: number,
  seedPrefix: string,
): CardTemplateParams["drone-degree-identify"]["prompts"] {
  const out: CardTemplateParams["drone-degree-identify"]["prompts"] = [];
  for (let i = 0; i < count; i++) {
    const isThird = seededChance(`${seedPrefix}:min-b3v5:${i}`);
    out.push({
      key,
      playedPitchClass: isThird ? pcDegree(key, 3) : pcDegree(key, 7),
      correctOptionIndex: isThird ? 0 : 1,
    });
  }
  return out;
}

/**
 * Six-degree (non-root) identify: scale degrees 2-7 (major) or 2, b3, 4, 5,
 * b6, b7 (minor). Buttons must be `SIX_DEGREE_BUTTONS_*` so option indices
 * align with the (degree - 2) zero-based offset returned here.
 */
function fullDiatonicPrompts(
  key: KeyContext,
  count: number,
  seedPrefix: string,
): CardTemplateParams["drone-degree-identify"]["prompts"] {
  const scale = key.mode === "major" ? DEGREES_MAJOR : DEGREES_MINOR;
  const nonRoot = scale.slice(1);
  const out: CardTemplateParams["drone-degree-identify"]["prompts"] = [];
  for (let i = 0; i < count; i++) {
    const idx = seededIndex(`${seedPrefix}:full-diat:${i}`, nonRoot.length);
    out.push({
      key,
      playedPitchClass: pcDegree(key, nonRoot[idx]!),
      correctOptionIndex: idx,
    });
  }
  return out;
}

/**
 * Levels that intentionally have NO graded practice cards — they're
 * concept-explainer + drone listening only. Completion logic special-cases
 * these so they advance once the explainer has been seen.
 *
 * A-1 (C major tonic) and A-12 (A minor tonic) are pure listening levels
 * in their respective phases.
 */
export const EXPLAINER_ONLY_LEVELS: ReadonlySet<string> = new Set([
  "A-1",
  "A-12",
]);

function resolvePracticeCards(levelId: string): BuiltCard[] {
  switch (levelId) {
    // ─── Track A — Phase 1 (Major) ────────────────────────────────────
    case "A-1":
      return [];
    case "A-2":
      return [
        noteFinding("A", "A-2", {
          noteName: "C",
          stringIndex: 5,
          stringDescription: "low E",
          roundCount: 8,
          hintEmphasis: hintEmphasisForLevel("A", "A-2"),
        }),
        noteFinding("A", "A-2", {
          pool: { notes: ["C"], stringIndices: [5, 4, 3, 2, 1, 0] },
          roundCount: 10,
          hintEmphasis: hintEmphasisForLevel("A", "A-2"),
        }),
      ];
    case "A-3":
      return [
        dronePlay("A", "A-3", C_MAJOR, [
          { text: "Play the 5th.", expectedPitchClasses: [7] },
        ]),
        dronePlay(
          "A",
          "A-3",
          C_MAJOR,
          [
            { text: "Play the root.", expectedPitchClasses: [0] },
            { text: "Now play the 5th.", expectedPitchClasses: [7] },
            { text: "Now back to the root.", expectedPitchClasses: [0] },
          ],
          "Move between root and 5th",
        ),
      ];
    case "A-4":
      return [
        dronePlay("A", "A-4", C_MAJOR, [
          { text: "Play the 3rd.", expectedPitchClasses: [4] },
        ]),
        dronePlay(
          "A",
          "A-4",
          C_MAJOR,
          [
            { text: "Play the root.", expectedPitchClasses: [0] },
            { text: "Now play the 3rd.", expectedPitchClasses: [4] },
            { text: "Now play the 5th.", expectedPitchClasses: [7] },
          ],
          "Root → 3rd → 5th (the major triad)",
        ),
        droneIdentify(
          "A",
          "A-4",
          [{ label: "Major 3rd (bright)" }, { label: "Minor 3rd (dark)" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 4; i++) {
              const isMajor = seededChance(`A-4:ch:0`);
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
      ];
    case "A-5":
      // Stable Tones Consolidation — pure-drill 3rd vs. 5th in major,
      // plus the first melodic-dictation card (3-note phrases using 1/3/5).
      return [
        droneIdentify(
          "A",
          "A-5",
          THREE_VS_FIVE_MAJOR,
          stableTonesPromptsMajor(C_MAJOR, 6, "A-5"),
          "3rd vs. 5th — C major",
        ),
        dronePlay(
          "A",
          "A-5",
          C_MAJOR,
          [
            { text: "Play the root.", expectedPitchClasses: [0] },
            { text: "Now the 3rd.", expectedPitchClasses: [4] },
            { text: "Now the 5th.", expectedPitchClasses: [7] },
            { text: "Now back to the 3rd.", expectedPitchClasses: [4] },
            { text: "Now back to the root.", expectedPitchClasses: [0] },
          ],
          "Phrase: 1 → 3 → 5 → 3 → 1",
        ),
        // A randomly-sampled 3-note phrase using only the 3 degrees the
        // user knows by ear (1, 3, 5). The same phrase is what the user
        // hears and what they play back; octave-equivalent matching means
        // they can find the notes anywhere on the neck.
        (() => {
          const degreeMidiMap: Record<string, number> = {
            "1": 60,
            "3": 64,
            "5": 67,
          };
          const labels = ["3", "5"] as const;
          // Pick three labels with no immediate repeats — gives "1-3-5",
          // "5-3-1", "3-5-1", "1-5-3", etc.
          const seq: string[] = [];
          for (let i = 0; i < 3; i++) {
            let pick = labels[seededIndex(`A-5:seq:${i}`, labels.length)]!;
            while (i > 0 && pick === seq[i - 1]) {
              pick = labels[seededIndex(`A-5:seq:${i}:retry`, labels.length)]!;
            }
            seq.push(pick);
          }
          return card("melodic-dictation", "A", "A-5", {
            keyLabel: C_MAJOR.keyLabel,
            tonicMidi: C_MAJOR.tonicMidi,
            mode: "major",
            sequence: seq.map((d) => degreeMidiMap[d]!),
            degreeLabels: seq,
            droneEnabled: true,
            uiTitle: "Sing it back — 1, 3, 5",
            uiDescription:
              "Three notes drawn from root, 3rd, and 5th. Hear the phrase, then play it back in order.",
            hintEmphasis: "default",
          });
        })(),
      ];
    case "A-6":
      return [
        dronePlay("A", "A-6", C_MAJOR, [
          { text: "Play the 7th (B in C major).", expectedPitchClasses: [11] },
        ]),
        dronePlay(
          "A",
          "A-6",
          C_MAJOR,
          [
            { text: "Play the 7th.", expectedPitchClasses: [11] },
            { text: "Now resolve up to the root.", expectedPitchClasses: [0] },
          ],
          "Resolve 7 → 1",
        ),
        droneIdentify(
          "A",
          "A-6",
          [{ label: "The 5th (open, hovering)" }, { label: "The 7th (leading)" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const isSeventh = seededChance(`A-6:ch:0`);
              out.push({
                key: C_MAJOR,
                playedPitchClass: isSeventh ? 11 : 7,
                correctOptionIndex: isSeventh ? 1 : 0,
              });
            }
            return out;
          })(),
          "7 vs. 5",
        ),
      ];
    case "A-7":
      return [
        dronePlay("A", "A-7", C_MAJOR, [
          { text: "Play the 4th.", expectedPitchClasses: [5] },
        ]),
        dronePlay(
          "A",
          "A-7",
          C_MAJOR,
          [
            { text: "Play the 4th.", expectedPitchClasses: [5] },
            { text: "Now resolve down to the 3rd.", expectedPitchClasses: [4] },
          ],
          "Resolve 4 → 3",
        ),
        droneIdentify(
          "A",
          "A-7",
          [{ label: "The 3rd (resolved)" }, { label: "The 4th (leaning)" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const isThree = seededChance(`A-7:ch:0`);
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
    case "A-8":
      // Mid-tension Consolidation — 3 vs. 4 vs. 5 vs. 7.
      return [
        droneIdentify(
          "A",
          "A-8",
          [{ label: "3" }, { label: "4" }, { label: "5" }, { label: "7" }],
          (() => {
            const map = [4, 5, 7, 11];
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 6; i++) {
              const idx = seededIndex(`A-8:idx:0`, 4);
              out.push({
                key: C_MAJOR,
                playedPitchClass: map[idx]!,
                correctOptionIndex: idx,
              });
            }
            return out;
          })(),
          "3 / 4 / 5 / 7 in C major",
        ),
        dronePlay(
          "A",
          "A-8",
          C_MAJOR,
          [
            { text: "Play the 7.", expectedPitchClasses: [11] },
            { text: "Resolve up to the root.", expectedPitchClasses: [0] },
            { text: "Play the 4.", expectedPitchClasses: [5] },
            { text: "Resolve down to the 3.", expectedPitchClasses: [4] },
            { text: "Down to the root.", expectedPitchClasses: [0] },
          ],
          "Tension → resolution phrase",
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
          [{ label: "2nd" }, { label: "3rd" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const isTwo = seededChance(`A-9:ch:0`);
              out.push({
                key: C_MAJOR,
                playedPitchClass: isTwo ? 2 : 4,
                correctOptionIndex: isTwo ? 0 : 1,
              });
            }
            return out;
          })(),
          "2nd vs. 3rd",
        ),
        droneIdentify(
          "A",
          "A-9",
          [{ label: "2" }, { label: "7" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const isTwo = seededChance(`A-9:ch:1`);
              out.push({
                key: C_MAJOR,
                playedPitchClass: isTwo ? 2 : 11,
                correctOptionIndex: isTwo ? 0 : 1,
              });
            }
            return out;
          })(),
          "2 vs. 7 — both a step from the root",
          "Both are a whole/half step from the root — listen for direction.",
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
          [{ label: "5" }, { label: "6" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const isSix = seededChance(`A-10:ch:0`);
              out.push({
                key: C_MAJOR,
                playedPitchClass: isSix ? 9 : 7,
                correctOptionIndex: isSix ? 1 : 0,
              });
            }
            return out;
          })(),
          "5 vs. 6",
        ),
      ];
    case "A-11":
      // Full Major Diatonic — drill all six non-root degrees in C, then mix keys.
      return [
        droneIdentify(
          "A",
          "A-11",
          SIX_DEGREE_BUTTONS_MAJOR,
          fullDiatonicPrompts(C_MAJOR, 6, "A-11"),
          "Full diatonic — C major",
          "The drone is the root; identify which non-root degree you hear.",
        ),
        droneIdentify(
          "A",
          "A-11",
          SIX_DEGREE_BUTTONS_MAJOR,
          fullDiatonicPrompts(G_MAJOR, 6, "A-11"),
          "Full diatonic — G major",
        ),
        dronePlay(
          "A",
          "A-11",
          C_MAJOR,
          [
            { text: "Play the 4.", expectedPitchClasses: [5] },
            { text: "Play the 6.", expectedPitchClasses: [9] },
            { text: "Play the 2.", expectedPitchClasses: [2] },
            { text: "Play the 7.", expectedPitchClasses: [11] },
          ],
          "Target each non-root degree",
        ),
      ];

    // ─── Track A — Phase 2 (Minor) ────────────────────────────────────
    case "A-12":
      return [];
    case "A-13":
      // Re-orient root + 5th in minor.
      return [
        dronePlay("A", "A-13", A_MINOR, [
          { text: "Play the root.", expectedPitchClasses: [9] },
        ]),
        dronePlay("A", "A-13", A_MINOR, [
          { text: "Play the 5th.", expectedPitchClasses: [4] },
        ]),
        dronePlay(
          "A",
          "A-13",
          A_MINOR,
          [
            { text: "Play the root.", expectedPitchClasses: [9] },
            { text: "Now play the 5th.", expectedPitchClasses: [4] },
            { text: "Now back to the root.", expectedPitchClasses: [9] },
          ],
          "Root and 5th in A minor",
        ),
      ];
    case "A-14":
      return [
        dronePlay("A", "A-14", A_MINOR, [
          { text: "Play the flat 3rd (C in A minor).", expectedPitchClasses: [0] },
        ]),
        dronePlay(
          "A",
          "A-14",
          A_MINOR,
          [
            { text: "Play the root.", expectedPitchClasses: [9] },
            { text: "Now the flat 3rd.", expectedPitchClasses: [0] },
            { text: "Now the 5th.", expectedPitchClasses: [4] },
            { text: "Back to the root.", expectedPitchClasses: [9] },
          ],
          "Minor triad: 1 → b3 → 5 → 1",
        ),
        droneIdentify(
          "A",
          "A-14",
          FLAT_THREE_VS_FIVE,
          stableTonesPromptsMinor(A_MINOR, 5, "A-13"),
          "Flat 3rd vs. 5th — A minor",
        ),
      ];
    case "A-15":
      return [
        dronePlay("A", "A-15", A_MINOR, [
          { text: "Play the flat 7 (G in A minor).", expectedPitchClasses: [7] },
        ]),
        dronePlay(
          "A",
          "A-15",
          A_MINOR,
          [
            { text: "Play the flat 7.", expectedPitchClasses: [7] },
            { text: "Now the root.", expectedPitchClasses: [9] },
          ],
          "Flat 7 → root",
        ),
        droneIdentify(
          "A",
          "A-15",
          [{ label: "Flat 3rd" }, { label: "5th" }, { label: "Flat 7" }],
          (() => {
            const map = [0, 4, 7];
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 6; i++) {
              const idx = seededIndex(`A-15:idx:0`, 3);
              out.push({
                key: A_MINOR,
                playedPitchClass: map[idx]!,
                correctOptionIndex: idx,
              });
            }
            return out;
          })(),
          "b3 / 5 / b7 in A minor",
          "Drone is the root — pick which other chord/blues tone you hear.",
        ),
      ];
    case "A-16":
      return [
        dronePlay("A", "A-16", A_MINOR, [
          { text: "Play the flat 6 (F in A minor).", expectedPitchClasses: [5] },
        ]),
        dronePlay("A", "A-16", A_MINOR, [
          { text: "Play the 2nd (B in A minor).", expectedPitchClasses: [11] },
        ]),
        droneIdentify(
          "A",
          "A-16",
          [{ label: "2" }, { label: "b3" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const isTwo = seededChance(`A-16:ch:0`);
              out.push({
                key: A_MINOR,
                playedPitchClass: isTwo ? 11 : 0,
                correctOptionIndex: isTwo ? 0 : 1,
              });
            }
            return out;
          })(),
          "2 vs. b3 in A minor",
        ),
        droneIdentify(
          "A",
          "A-16",
          [{ label: "b6" }, { label: "b7" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 5; i++) {
              const isSix = seededChance(`A-16:ch:1`);
              out.push({
                key: A_MINOR,
                playedPitchClass: isSix ? 5 : 7,
                correctOptionIndex: isSix ? 0 : 1,
              });
            }
            return out;
          })(),
          "b6 vs. b7 in A minor",
        ),
      ];
    case "A-17":
      // Full Minor Diatonic — drill the six non-root degrees in A minor + E minor.
      return [
        droneIdentify(
          "A",
          "A-17",
          SIX_DEGREE_BUTTONS_MINOR,
          fullDiatonicPrompts(A_MINOR, 6, "A-17"),
          "Full diatonic — A minor",
          "The drone is the root; identify which non-root degree you hear.",
        ),
        droneIdentify(
          "A",
          "A-17",
          SIX_DEGREE_BUTTONS_MINOR,
          fullDiatonicPrompts(E_MINOR, 6, "A-17"),
          "Full diatonic — E minor",
        ),
      ];
    case "A-18":
      // Cross-mode Consolidation — mix major and minor prompts.
      return [
        droneIdentify(
          "A",
          "A-18",
          [{ label: "Major 3rd (bright)" }, { label: "Minor 3rd (dark)" }],
          (() => {
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 6; i++) {
              const isMajor = seededChance(`A-18:ch:0`);
              const k = isMajor ? C_MAJOR : A_MINOR;
              out.push({
                key: k,
                playedPitchClass: isMajor
                  ? pcDegree(k, 4)
                  : pcDegree(k, 3),
                correctOptionIndex: isMajor ? 0 : 1,
              });
            }
            return out;
          })(),
          "Major vs. minor 3rd — cross-key",
        ),
        droneIdentify(
          "A",
          "A-18",
          [{ label: "Major (3, 6, 7)" }, { label: "Minor (b3, b6, b7)" }],
          (() => {
            const majorVariants = [4, 9, 11];
            const minorVariants = [3, 8, 10];
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 6; i++) {
              const isMajor = seededChance(`A-18:ch:${i}`);
              const k = isMajor ? C_MAJOR : A_MINOR;
              const offsets = isMajor ? majorVariants : minorVariants;
              out.push({
                key: k,
                playedPitchClass: pcDegree(k, pickRandom(offsets, `A-18:off:${i}`)),
                correctOptionIndex: isMajor ? 0 : 1,
              });
            }
            return out;
          })(),
          "Major-vs-minor flavor — by ear",
        ),
      ];

    // ─── Track A — Phase 3 (Cross-key) ────────────────────────────────
    case "A-19":
      return [
        dronePlay("A", "A-19", G_MAJOR, [
          { text: "Play the 5th in G major (D).", expectedPitchClasses: [pcDegree(G_MAJOR, 7)] },
        ]),
        dronePlay("A", "A-19", D_MAJOR, [
          { text: "Play the 3rd in D major (F#).", expectedPitchClasses: [pcDegree(D_MAJOR, 4)] },
        ]),
        droneIdentify(
          "A",
          "A-19",
          SIX_DEGREE_BUTTONS_MAJOR,
          fullDiatonicPrompts(G_MAJOR, 5, "A-20"),
          "Full diatonic — G major",
        ),
        droneIdentify(
          "A",
          "A-19",
          SIX_DEGREE_BUTTONS_MAJOR,
          fullDiatonicPrompts(D_MAJOR, 5, "A-20"),
          "Full diatonic — D major",
        ),
      ];
    case "A-20": {
      // All Major Keys — sample a random major key per prompt.
      const MAJOR_KEYS: KeyContext[] = [
        C_MAJOR,
        G_MAJOR,
        D_MAJOR,
        { tonicMidi: 57, keyLabel: "A major", mode: "major" },
        { tonicMidi: 64, keyLabel: "E major", mode: "major" },
        { tonicMidi: 53, keyLabel: "F major", mode: "major" },
      ];
      const majorPrompts: CardTemplateParams["drone-degree-identify"]["prompts"] =
        [];
      for (let i = 0; i < 8; i++) {
        const k = pickRandom(MAJOR_KEYS, `A-20:key:${i}`);
        const nonRoot = DEGREES_MAJOR.slice(1);
        const idx = seededIndex(`A-20:idx:${i}`, nonRoot.length);
        majorPrompts.push({
          key: k,
          playedPitchClass: pcDegree(k, nonRoot[idx]!),
          correctOptionIndex: idx,
          transitionText: `Drone in ${k.keyLabel}.`,
        });
      }
      return [
        droneIdentify(
          "A",
          "A-20",
          SIX_DEGREE_BUTTONS_MAJOR,
          majorPrompts,
          "Mixed major keys — degrees 2-7",
          "Each prompt uses a random major key. Identify the non-root degree.",
        ),
      ];
    }
    case "A-21":
      return [
        dronePlay("A", "A-21", E_MINOR, [
          { text: "Play the flat 3rd in E minor (G).", expectedPitchClasses: [pcDegree(E_MINOR, 3)] },
        ]),
        dronePlay("A", "A-21", D_MINOR, [
          { text: "Play the 5th in D minor (A).", expectedPitchClasses: [pcDegree(D_MINOR, 7)] },
        ]),
        droneIdentify(
          "A",
          "A-21",
          SIX_DEGREE_BUTTONS_MINOR,
          fullDiatonicPrompts(E_MINOR, 5, "A-22"),
          "Full diatonic — E minor",
        ),
        droneIdentify(
          "A",
          "A-21",
          SIX_DEGREE_BUTTONS_MINOR,
          fullDiatonicPrompts(D_MINOR, 5, "A-22"),
          "Full diatonic — D minor",
        ),
      ];
    case "A-22": {
      // All Keys, All Modes — the capstone consolidation.
      const ALL_MAJOR: KeyContext[] = [
        C_MAJOR,
        G_MAJOR,
        D_MAJOR,
        { tonicMidi: 57, keyLabel: "A major", mode: "major" },
        { tonicMidi: 64, keyLabel: "E major", mode: "major" },
        { tonicMidi: 53, keyLabel: "F major", mode: "major" },
      ];
      const ALL_MINOR: KeyContext[] = [
        A_MINOR,
        E_MINOR,
        D_MINOR,
        { tonicMidi: 59, keyLabel: "B minor", mode: "minor" },
      ];
      const majorPrompts: CardTemplateParams["drone-degree-identify"]["prompts"] =
        [];
      const minorPrompts: CardTemplateParams["drone-degree-identify"]["prompts"] =
        [];
      for (let i = 0; i < 6; i++) {
        const k = pickRandom(ALL_MAJOR, `A-22:maj-key:${i}`);
        const nonRoot = DEGREES_MAJOR.slice(1);
        const idx = seededIndex(`A-22:maj-idx:${i}`, nonRoot.length);
        majorPrompts.push({
          key: k,
          playedPitchClass: pcDegree(k, nonRoot[idx]!),
          correctOptionIndex: idx,
          transitionText: `Drone in ${k.keyLabel}.`,
        });
      }
      for (let i = 0; i < 6; i++) {
        const k = pickRandom(ALL_MINOR, `A-22:min-key:${i}`);
        const nonRoot = DEGREES_MINOR.slice(1);
        const idx = seededIndex(`A-22:min-idx:${i}`, nonRoot.length);
        minorPrompts.push({
          key: k,
          playedPitchClass: pcDegree(k, nonRoot[idx]!),
          correctOptionIndex: idx,
          transitionText: `Drone in ${k.keyLabel}.`,
        });
      }
      return [
        droneIdentify(
          "A",
          "A-22",
          SIX_DEGREE_BUTTONS_MAJOR,
          majorPrompts,
          "Any major key — non-root degree",
          "Each prompt uses a random major key.",
        ),
        droneIdentify(
          "A",
          "A-22",
          SIX_DEGREE_BUTTONS_MINOR,
          minorPrompts,
          "Any minor key — non-root degree",
          "Each prompt uses a random minor key.",
        ),
      ];
    }

    // ─── Track B (string-by-string, then note-class across neck) ─────
    case "B-1":
      return [
        noteFinding("B", "B-1", {
          pool: {
            notes: ["C", "D", "E", "F", "G", "A", "B"],
            stringIndices: [5],
          },
          roundCount: 10,
        }),
      ];
    case "B-2":
      return [
        noteFinding("B", "B-2", {
          pool: {
            notes: ["C", "D", "E", "F", "G", "A", "B"],
            stringIndices: [4],
          },
          roundCount: 10,
        }),
      ];
    case "B-3":
      return [
        noteFinding("B", "B-3", {
          pool: {
            notes: ["C", "D", "E", "F", "G", "A", "B"],
            stringIndices: [5, 4],
          },
          roundCount: 10,
        }),
      ];
    case "B-4":
      return [
        noteFinding("B", "B-4", {
          pool: {
            notes: ["C", "D", "E", "F", "G", "A", "B"],
            stringIndices: [3],
          },
          roundCount: 10,
        }),
      ];
    case "B-5":
      return [
        noteFinding("B", "B-5", {
          pool: {
            notes: ["C", "D", "E", "F", "G", "A", "B"],
            stringIndices: [2],
          },
          roundCount: 10,
        }),
      ];
    case "B-6":
      return [
        noteFinding("B", "B-6", {
          pool: {
            notes: ["C", "D", "E", "F", "G", "A", "B"],
            stringIndices: [1],
          },
          roundCount: 10,
        }),
      ];
    case "B-7":
      return [
        noteFinding("B", "B-7", {
          pool: {
            notes: ["C", "D", "E", "F", "G", "A", "B"],
            stringIndices: [0],
          },
          roundCount: 10,
        }),
      ];
    case "B-8":
      return [
        noteFinding("B", "B-8", {
          noteName: "C",
          allStringsLowestFret: true,
          allStringsProgressiveTwoPerString: true,
        }),
      ];
    case "B-9":
      return [
        noteFinding("B", "B-9", {
          noteName: "G",
          allStringsLowestFret: true,
          allStringsProgressiveTwoPerString: true,
        }),
      ];
    case "B-10":
      return [
        noteFinding("B", "B-10", {
          noteName: "D",
          allStringsLowestFret: true,
          allStringsProgressiveTwoPerString: true,
        }),
      ];
    case "B-11":
      return [
        noteFinding("B", "B-11", {
          noteName: "A",
          allStringsLowestFret: true,
          allStringsProgressiveTwoPerString: true,
        }),
      ];
    case "B-12":
      return [
        noteFinding("B", "B-12", {
          noteName: "E",
          allStringsLowestFret: true,
          allStringsProgressiveTwoPerString: true,
        }),
      ];
    case "B-13":
      return [
        noteFinding("B", "B-13", {
          noteName: "F",
          allStringsLowestFret: true,
          allStringsProgressiveTwoPerString: true,
        }),
      ];
    case "B-14":
      return [
        noteFinding("B", "B-14", {
          noteName: "B",
          allStringsLowestFret: true,
          allStringsProgressiveTwoPerString: true,
        }),
      ];
    case "B-15":
      return [
        noteFinding("B", "B-15", {
          pool: { notes: ["C#", "D#", "F#", "G#", "A#"] },
          roundCount: 10,
        }),
      ];
    case "B-16":
      return [
        noteFinding("B", "B-16", {
          pool: { notes: ["C", "D", "E", "F", "G", "A", "B"] },
          roundCount: 12,
        }),
      ];
    case "B-17":
      return [
        noteFinding("B", "B-17", {
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
    case "B-18":
      return [
        noteFinding("B", "B-18", {
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

    // ─── Track C (unchanged) ─────────────────────────────────────────
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
          title: "C·3 · P1 — Position 1 major scale ascending in G",
          intro:
            "Two octaves, 15 notes. Root at 6/3 under finger 2. Same fingering slides to any major key.",
          steps: shape.steps,
          restartOnError: true,
        }),
        shapeRecall("C-3", {
          title: "C·3 · P2 — Position 1 major scale descending in G",
          intro: "Reverse direction; same fingering.",
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
            { stringIndex: 5, fret: 8, finger: 4, degree: "b3" },
            { stringIndex: 2, fret: 5, finger: 1, degree: "b3" },
            { stringIndex: 0, fret: 8, finger: 4, degree: "b3" },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-7", {
          title: "C·7 · P2 — Play only the 5ths",
          intro: "Two E's inside Box 1: A string fret 7, B string fret 5.",
          steps: [
            { stringIndex: 4, fret: 7, finger: 3, degree: "5" },
            { stringIndex: 1, fret: 5, finger: 1, degree: "5" },
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
            { stringIndex: 3, fret: 7, finger: 1, degree: "1" },
            { stringIndex: 1, fret: 10, finger: 4, degree: "1" },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-11", {
          title: "C·11 · P2 — Flat 3rds in Box 2",
          intro:
            "Three C's: low E fret 8, D string fret 10, high e fret 8.",
          steps: [
            { stringIndex: 5, fret: 8, finger: 2, degree: "b3" },
            { stringIndex: 3, fret: 10, finger: 4, degree: "b3" },
            { stringIndex: 0, fret: 8, finger: 2, degree: "b3" },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-11", {
          title: "C·11 · P3 — 5ths in Box 2",
          intro: "Two E's: 5/7, 3/9.",
          steps: [
            { stringIndex: 4, fret: 7, finger: 1, degree: "5" },
            { stringIndex: 2, fret: 9, finger: 3, degree: "5" },
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
            { stringIndex: 5, fret: 5, finger: 1, degree: "1" },
            { stringIndex: 5, fret: 8, finger: 3, degree: "b3" },
            { stringIndex: 5, fret: 10, finger: 4, degree: "4" },
          ],
          restartOnError: true,
        }),
        shapeRecall("C-14", {
          title: "C·14 · P2 — Walk across the boxes ascending",
          intro: "6-note line spanning Box 1 and Box 2.",
          steps: [
            { stringIndex: 5, fret: 5, finger: 1, degree: "1" },
            { stringIndex: 4, fret: 5, finger: 1, degree: "4" },
            { stringIndex: 4, fret: 7, finger: 3, degree: "5" },
            { stringIndex: 4, fret: 10, finger: 4, degree: "b7" },
            { stringIndex: 3, fret: 7, finger: 3, degree: "1" },
            { stringIndex: 3, fret: 10, finger: 4, degree: "b3" },
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

    // ─── Track D (chord changes) ─────────────────────────────────────
    case "D-1":
      return [
        chordDrillPreflight("D-1")!,
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
        chordDrillPreflight("D-2")!,
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
        chordDrillPreflight("D-3")!,
        chordIdentify(
          "D-3",
          [
            { label: "I" },
            { label: "ii" },
            { label: "IV" },
            { label: "V" },
            { label: "vi" },
          ],
          [
            {
              keyLabel: "C major — ii-V-I",
              chords: [CHORDS.Dm!, CHORDS.G!, CHORDS.C!],
              askPositionIndex: 1,
              correctOptionIndex: 1,
              transitionText: "Which was chord 1? (the 'pre-dominant')",
            },
            {
              keyLabel: "C major — I-vi-ii-V",
              chords: [CHORDS.C!, CHORDS.Am!, CHORDS.Dm!, CHORDS.G!],
              askPositionIndex: 3,
              correctOptionIndex: 1,
              transitionText: "Which was chord 3?",
            },
            {
              keyLabel: "C major — I-IV-ii-V",
              chords: [CHORDS.C!, CHORDS.F!, CHORDS.Dm!, CHORDS.G!],
              askPositionIndex: 3,
              correctOptionIndex: 1,
              transitionText: "Which was chord 3?",
            },
            {
              keyLabel: "C major — I-V-vi-IV",
              chords: [CHORDS.C!, CHORDS.G!, CHORDS.Am!, CHORDS.F!],
              askPositionIndex: 3,
              correctOptionIndex: 4,
              transitionText: "Which was chord 3?",
            },
            {
              keyLabel: "C major — I-vi-IV-V",
              chords: [CHORDS.C!, CHORDS.Am!, CHORDS.F!, CHORDS.G!],
              askPositionIndex: 4,
              correctOptionIndex: 3,
              transitionText: "Which was chord 4?",
            },
            {
              keyLabel: "C major — vi-IV-I-V",
              chords: [CHORDS.Am!, CHORDS.F!, CHORDS.C!, CHORDS.G!],
              askPositionIndex: 1,
              correctOptionIndex: 4,
              transitionText: "Which was chord 1?",
            },
            {
              keyLabel: "G major — I-V-vi-IV",
              chords: [CHORDS.G!, CHORDS.D!, CHORDS.Em!, CHORDS.C!],
              askPositionIndex: 2,
              correctOptionIndex: 3,
              transitionText: "Which was chord 2?",
            },
          ],
        ),
      ];
    case "D-4":
      return [
        chordDrillPreflight("D-4")!,
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
        chordDrillPreflight("D-5")!,
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
              chords: [CHORDS.D!, CHORDS.A!, CHORDS.Bm!, CHORDS.G!],
              askPositionIndex: 3,
              correctOptionIndex: 3,
              transitionText: "Which was chord 3?",
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

    // ─── Track E (intervals, 17 levels) ──────────────────────────────
    case "E-1":
      // Perfect 5th vs. anchor (M3 — both consonant, M3 is smaller).
      return [
        intervalIdentify(
          "E-1",
          [{ label: "Major 3rd" }, { label: "Perfect 5th" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isP5 = seededChance(`E-1:ch:0`);
              const semi = isP5 ? 7 : 4;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isP5 ? 1 : 0,
                actualLabel: isP5 ? "perfect 5th" : "major 3rd",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-2":
      // Perfect 4th vs. Perfect 5th.
      return [
        intervalIdentify(
          "E-2",
          [{ label: "Perfect 4th" }, { label: "Perfect 5th" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isP4 = seededChance(`E-2:ch:0`);
              const semi = isP4 ? 5 : 7;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isP4 ? 0 : 1,
                actualLabel: isP4 ? "perfect 4th" : "perfect 5th",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-3":
      // Major 3rd vs. Perfect 4th (close in size, opposite color).
      return [
        intervalIdentify(
          "E-3",
          [{ label: "Major 3rd" }, { label: "Perfect 4th" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isM3 = seededChance(`E-3:ch:0`);
              const semi = isM3 ? 4 : 5;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isM3 ? 0 : 1,
                actualLabel: isM3 ? "major 3rd" : "perfect 4th",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-4":
      // Consolidation: M3 / P4 / P5.
      return [
        intervalIdentify(
          "E-4",
          [
            { label: "Major 3rd" },
            { label: "Perfect 4th" },
            { label: "Perfect 5th" },
          ],
          (() => {
            const map = [4, 5, 7];
            const labels = ["major 3rd", "perfect 4th", "perfect 5th"];
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 6; i++) {
              const idx = seededIndex(`E-4:idx:0`, 3);
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
      // Major 2nd vs. Major 3rd.
      return [
        intervalIdentify(
          "E-5",
          [{ label: "Major 2nd" }, { label: "Major 3rd" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isM2 = seededChance(`E-5:ch:0`);
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
    case "E-6":
      // Major 6th vs. Perfect 5th.
      return [
        intervalIdentify(
          "E-6",
          [{ label: "Perfect 5th" }, { label: "Major 6th" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isM6 = seededChance(`E-6:ch:0`);
              const semi = isM6 ? 9 : 7;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isM6 ? 1 : 0,
                actualLabel: isM6 ? "major 6th" : "perfect 5th",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-7":
      // Major 7th vs. Perfect 5th (or Octave — but octave isn't taught yet).
      return [
        intervalIdentify(
          "E-7",
          [{ label: "Perfect 5th" }, { label: "Major 7th" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isM7 = seededChance(`E-7:ch:0`);
              const semi = isM7 ? 11 : 7;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isM7 ? 1 : 0,
                actualLabel: isM7 ? "major 7th" : "perfect 5th",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-8":
      // Ascending Majors Consolidation: M2 / M3 / P4 / P5 / M6 / M7.
      return [
        intervalIdentify(
          "E-8",
          [
            { label: "Major 2nd" },
            { label: "Major 3rd" },
            { label: "Perfect 4th" },
            { label: "Perfect 5th" },
            { label: "Major 6th" },
            { label: "Major 7th" },
          ],
          (() => {
            const map = [2, 4, 5, 7, 9, 11];
            const labels = [
              "major 2nd",
              "major 3rd",
              "perfect 4th",
              "perfect 5th",
              "major 6th",
              "major 7th",
            ];
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 6; i++) {
              const idx = seededIndex(`E-8:idx:0`, 6);
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
    case "E-9":
      // Minor 3rd vs. Major 3rd.
      return [
        intervalIdentify(
          "E-9",
          [{ label: "Minor 3rd" }, { label: "Major 3rd" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isMin = seededChance(`E-9:ch:0`);
              const semi = isMin ? 3 : 4;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isMin ? 0 : 1,
                actualLabel: isMin ? "minor 3rd" : "major 3rd",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-10":
      // Minor 7th vs. Major 7th.
      return [
        intervalIdentify(
          "E-10",
          [{ label: "Minor 7th" }, { label: "Major 7th" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isMin = seededChance(`E-10:ch:0`);
              const semi = isMin ? 10 : 11;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isMin ? 0 : 1,
                actualLabel: isMin ? "minor 7th" : "major 7th",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-11":
      // Minor 6th vs. Major 6th.
      return [
        intervalIdentify(
          "E-11",
          [{ label: "Minor 6th" }, { label: "Major 6th" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isMin = seededChance(`E-11:ch:0`);
              const semi = isMin ? 8 : 9;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isMin ? 0 : 1,
                actualLabel: isMin ? "minor 6th" : "major 6th",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-12":
      // Minor 2nd vs. Major 2nd.
      return [
        intervalIdentify(
          "E-12",
          [{ label: "Minor 2nd" }, { label: "Major 2nd" }],
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 5; i++) {
              const isMin = seededChance(`E-12:ch:0`);
              const semi = isMin ? 1 : 2;
              out.push({
                baseMidi: 60,
                semitones: semi,
                direction: "up",
                correctOptionIndex: isMin ? 0 : 1,
                actualLabel: isMin ? "minor 2nd" : "major 2nd",
              });
            }
            return out;
          })(),
        ),
      ];
    case "E-13":
      // Tritone vs. P4 / P5 (its closest neighbours).
      return [
        intervalIdentify(
          "E-13",
          [{ label: "Perfect 4th" }, { label: "Tritone" }, { label: "Perfect 5th" }],
          (() => {
            const map = [5, 6, 7];
            const labels = ["perfect 4th", "tritone", "perfect 5th"];
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 6; i++) {
              const idx = seededIndex(`E-13:idx:0`, 3);
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
    case "E-14": {
      // All Ascending Consolidation: 12 chromatic intervals (1..11 semitones).
      const map = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const labels = [
        "m2",
        "M2",
        "m3",
        "M3",
        "P4",
        "tritone",
        "P5",
        "m6",
        "M6",
        "m7",
        "M7",
      ];
      return [
        intervalIdentify(
          "E-14",
          labels.map((l) => ({ label: l })),
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 8; i++) {
              const idx = seededIndex(`E-14:idx:0`, map.length);
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
    }
    case "E-15": {
      // Descending — major anchors only: P5, P4, M3, m3.
      const map = [3, 4, 5, 7];
      const labels = ["m3", "M3", "P4", "P5"];
      return [
        intervalIdentify(
          "E-15",
          labels.map((l) => ({ label: l })),
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 6; i++) {
              const idx = seededIndex(`E-15:idx:0`, map.length);
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
    }
    case "E-16": {
      // Descending — remaining intervals.
      const map = [1, 2, 6, 8, 9, 10, 11];
      const labels = ["m2", "M2", "tritone", "m6", "M6", "m7", "M7"];
      return [
        intervalIdentify(
          "E-16",
          labels.map((l) => ({ label: l })),
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 6; i++) {
              const idx = seededIndex(`E-16:idx:0`, map.length);
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
    }
    case "E-17": {
      // Mixed Direction Consolidation — all intervals, either direction.
      const map = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const labels = [
        "m2",
        "M2",
        "m3",
        "M3",
        "P4",
        "tritone",
        "P5",
        "m6",
        "M6",
        "m7",
        "M7",
      ];
      return [
        intervalIdentify(
          "E-17",
          labels.map((l) => ({ label: l })),
          (() => {
            const out: CardTemplateParams["interval-identify"]["prompts"] = [];
            for (let i = 0; i < 8; i++) {
              const idx = seededIndex(`E-17:idx:0`, map.length);
              const dir = seededChance(`E-17:ch:1`) ? "up" : "down";
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
    }

    // ─── Track F (Improvisation) ─────────────────────────────────
    case "F-1":
      return [
        card("drone-degree-play", "F", "F-1", {
          keyLabel: C_MAJOR.keyLabel,
          tonicMidi: C_MAJOR.tonicMidi,
          mode: "major",
          uiTitle: "Chord tones of C major",
          uiDescription: "Land on any chord tone: 1 (C), 3 (E), or 5 (G).",
          prompts: [
            {
              text: "Play any chord tone of C major (C, E, or G).",
              expectedPitchClasses: [0, 4, 7],
            },
            { text: "Now the root (C).", expectedPitchClasses: [0] },
            { text: "Now the 3rd (E).", expectedPitchClasses: [4] },
            { text: "Now the 5th (G).", expectedPitchClasses: [7] },
          ],
          hintEmphasis: "default",
        }),
      ];
    case "F-2":
      return [
        card("drone-degree-play", "F", "F-2", {
          keyLabel: A_MINOR.keyLabel,
          tonicMidi: A_MINOR.tonicMidi,
          mode: "minor",
          uiTitle: "Chord tones of A minor",
          uiDescription: "Land on any chord tone: 1 (A), b3 (C), or 5 (E).",
          prompts: [
            {
              text: "Play any chord tone of A minor (A, C, or E).",
              expectedPitchClasses: [9, 0, 4],
            },
            { text: "Now the root (A).", expectedPitchClasses: [9] },
            { text: "Now the flat 3rd (C).", expectedPitchClasses: [0] },
            { text: "Now the 5th (E).", expectedPitchClasses: [4] },
          ],
          hintEmphasis: "default",
        }),
      ];
    case "F-3":
      return [
        droneIdentify(
          "F",
          "F-3",
          [{ label: "Chord tone" }, { label: "Not a chord tone" }],
          (() => {
            const chordTones = [0, 4, 7];
            const nonChord = [2, 5, 9, 11];
            const out: CardTemplateParams["drone-degree-identify"]["prompts"] =
              [];
            for (let i = 0; i < 6; i++) {
              const isChord = seededChance(`F-3:ch:${i}`);
              out.push({
                key: C_MAJOR,
                playedPitchClass: isChord
                  ? pickRandom(chordTones, `F-3:ct:${i}`)
                  : pickRandom(nonChord, `F-3:nc:${i}`),
                correctOptionIndex: isChord ? 0 : 1,
              });
            }
            return out;
          })(),
          "Chord tone vs. non-chord-tone (C major)",
        ),
        card("drone-degree-play", "F", "F-3", {
          keyLabel: C_MAJOR.keyLabel,
          tonicMidi: C_MAJOR.tonicMidi,
          mode: "major",
          uiTitle: "Target chord tones over a C major vamp",
          uiDescription: "Solo using diatonic notes, but land on chord tones.",
          prompts: [
            {
              text: "Phrase ending on any chord tone (C, E, or G).",
              expectedPitchClasses: [0, 4, 7],
            },
          ],
          hintEmphasis: "subtle",
        }),
      ];
    case "F-4":
      return [
        card("drone-degree-play", "F", "F-4", {
          keyLabel: A_MINOR.keyLabel,
          tonicMidi: A_MINOR.tonicMidi,
          mode: "minor",
          uiTitle: "Freeplay over A minor — capstone",
          uiDescription:
            "Drone is A. Solo freely. Resolve each phrase on a chord tone (A, C, or E).",
          prompts: [
            {
              text: "Solo any phrase. Resolve on A, C, or E.",
              expectedPitchClasses: [9, 0, 4],
            },
            {
              text: "Solo any phrase. Resolve on A, C, or E.",
              expectedPitchClasses: [9, 0, 4],
            },
            {
              text: "Solo any phrase. Resolve on A, C, or E.",
              expectedPitchClasses: [9, 0, 4],
            },
          ],
          hintEmphasis: "subtle",
        }),
      ];
    default:
      return [];
  }
}

/** Drops drone-play cards whose prompts were all tonic-only (removed by `dronePlay`). */
export function practiceCardsForLevel(levelId: string): BuiltCard[] {
  return resolvePracticeCards(levelId).filter((c) => {
    if (c.templateId === "drone-degree-play") {
      const p = c as BuiltCard<"drone-degree-play">;
      return p.parameters.prompts.length > 0;
    }
    return true;
  });
}

// Re-export utility shapes for other modules / tests.
export { intervalPlay };
