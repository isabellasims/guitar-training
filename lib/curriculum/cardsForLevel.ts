import type { BuiltCard, CardTemplateId, CardTemplateParams } from "@/lib/cards/types";
import type { TrackId } from "@/lib/domain/types";

const C_MAJOR = { tonicMidi: 60, keyLabel: "C major", mode: "major" as const };
const A_MINOR = { tonicMidi: 57, keyLabel: "A minor", mode: "minor" as const };

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

/** Concept-explainer card for a Foundation level. Returns null for Practice levels. */
export function explainerForLevel(levelId: string): BuiltCard | null {
  switch (levelId) {
    // ─── Track A ────────────────────────────────────────────
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
          "You don’t need to name any other notes yet. Names come later — first, sound.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
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
        ],
        body: [
          "A minor uses the same seven pitches as C major, but home is now A. The mood shifts even though the notes are the same.",
          "Use the A natural minor shape from Track C (Level 1) on the neck while you listen. Hum or play A wherever feels like home.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
      });
    case "A-3":
      return card("concept-explainer", "A", "A-3", {
        title: "The Root (degree 1)",
        terms: [
          {
            term: "Scale degree",
            definition:
              "A number 1–7 for each step of the key’s scale, counted from the tonic. Degree 1 is the tonic.",
          },
          { term: "Root", definition: "The note a chord or scale is named after — same pitch as the tonic of the key." },
        ],
        body: [
          "Drone in C. Sing or play C anywhere on the neck. Notice the “arrived, home” feeling.",
          "This is degree 1 — the foundation of every other degree you’ll learn.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
        scaleListen: { tonicMidi: C_MAJOR.tonicMidi, mode: "major" },
      });
    case "A-4":
      return card("concept-explainer", "A", "A-4", {
        title: "The 5th — stable, hovering",
        body: [
          "Over a C drone, G is the 5th. It feels stable but not “home” — like floating slightly above the ground.",
          "Sing or play G. Move between G and C and feel the difference: G hovers; C lands.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
      });
    case "A-5":
      return card("concept-explainer", "A", "A-5", {
        title: "The 3rd — color in the key",
        terms: [
          {
            term: "Major third",
            definition:
              "Two whole steps above the tonic. In a major key it is degree 3 — the bright color that defines “major.”",
          },
        ],
        body: [
          "E over a C drone is the 3rd. It’s the note that makes C sound major.",
          "Try the flat 3 (E♭) too — that’s how minor sounds. Same root, different color.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
      });
    case "A-7":
      return card("concept-explainer", "A", "A-7", {
        title: "The 7th — pulls toward home",
        body: [
          "Over a C drone, B is the 7th — restless, wants to slip up to C.",
          "B♭ is the “flat 7,” the bluesy color you’ll use later.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
      });
    case "A-8":
      return card("concept-explainer", "A", "A-8", {
        title: "The 4th — suspended",
        body: [
          "F over C is the 4th — leaning. Wants to fall back to E (the 3rd).",
          "Move 4 → 3 → 1 and feel the resolve.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
      });
    case "A-9":
      return card("concept-explainer", "A", "A-9", {
        title: "The 2nd — light tension",
        body: [
          "D over C is the 2nd. Light pull, can resolve up to the 3rd or down to the 1st.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
      });
    case "A-10":
      return card("concept-explainer", "A", "A-10", {
        title: "The 6th — wistful",
        body: [
          "A over C is the 6th — wistful in major, darker in minor.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
      });
    case "A-11":
      return card("concept-explainer", "A", "A-11", {
        title: "Chord Tones Only — solo on 1, ♭3, 5",
        body: [
          "Over an A minor vamp, restrict yourself to the chord tones of i: A (1), C (♭3), and E (5).",
          "Notice how every phrase sounds resolved when you stay on these three pitches.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
      });
    case "A-12":
      return card("concept-explainer", "A", "A-12", {
        title: "Add the Flat 7 — four-note blues vocabulary",
        body: [
          "Add G (♭7) to A, C, E. The blues spelling: 1, ♭3, 5, ♭7.",
          "This is the core voice of minor blues phrasing.",
        ],
        droneTonicMidi: A_MINOR.tonicMidi,
        droneKeyLabel: A_MINOR.keyLabel,
      });
    // ─── Track B ────────────────────────────────────────────
    case "B-1":
      return card("concept-explainer", "B", "B-1", {
        title: "Solidify the low E string",
        body: [
          "Track B is pure fretboard recall — separate from ear training, but it makes everything you hear in Track A land faster.",
          "First foothold: own the 6th (low E) string. Frets give names; names give freedom.",
        ],
      });
    case "B-3":
      return card("concept-explainer", "B", "B-3", {
        title: "C across all six strings",
        body: [
          "Same letter, six places (in 0–12). Owning one note across the neck is the gateway to owning all of them.",
        ],
      });
    // ─── Track C ────────────────────────────────────────────
    case "C-1":
      return card("concept-explainer", "C", "C-1", {
        title: "A natural minor — one octave",
        body: [
          "This is the shape Track A uses for minor drone work. Same notes as C major; centered on A.",
          "Memorize as fingering first, theory second.",
        ],
      });
    case "C-3":
      return card("concept-explainer", "C", "C-3", {
        title: "Pentatonic Box 1",
        body: [
          "The classic minor pentatonic box, root on the 6th string. Two notes per string. Own it cleanly before naming chord tones.",
        ],
      });
    case "C-4":
      return card("concept-explainer", "C", "C-4", {
        title: "Box 1 — Roots only",
        body: [
          "Find every root inside Box 1. Knowing roots first turns the box into a real chord-tone map later.",
        ],
      });
    case "C-5":
      return card("concept-explainer", "C", "C-5", {
        title: "Box 1 — All Chord Tones",
        body: [
          "With the root, 5th, and 3rd already in your ear from Track A, label every chord tone inside Box 1: roots, 5ths, and ♭3’s.",
        ],
      });
    case "C-6":
      return card("concept-explainer", "C", "C-6", {
        title: "E-Shape CAGED (Major)",
        body: [
          "In an E-shape barre: roots on strings 6, 4, and 1; 5ths on strings 5 and 2; the 3rd on string 3.",
          "Play any major chord in E-shape and find each chord tone in turn.",
        ],
      });
    case "C-7":
      return card("concept-explainer", "C", "C-7", {
        title: "E-Shape CAGED (Minor)",
        body: [
          "Same shape; the 3rd flattens to ♭3. You now have minor color anywhere on the neck via the E-shape.",
        ],
      });
    case "C-8":
      return card("concept-explainer", "C", "C-8", {
        title: "Pentatonic Box 2",
        body: [
          "The next box up the neck. A few frets above Box 1; same five pitches.",
        ],
      });
    case "C-9":
      return card("concept-explainer", "C", "C-9", {
        title: "Box 2 — Chord Tones",
        body: [
          "Identify roots, ♭3’s, and 5ths inside Box 2. Same labels as Box 1; new geometry.",
        ],
      });
    case "C-10":
      return card("concept-explainer", "C", "C-10", {
        title: "A-Shape CAGED",
        body: [
          "In an A-shape barre: roots on strings 5 and 2; 3rd on strings 4 and 1; 5th on string 3.",
        ],
      });
    case "C-12":
      return card("concept-explainer", "C", "C-12", {
        title: "D-Shape + Third Box",
        body: [
          "Add the D-shape CAGED chord tones and a third pentatonic box below Box 1. The neck starts to feel like one map.",
        ],
      });
    // ─── Track D ────────────────────────────────────────────
    case "D-1":
      return card("concept-explainer", "D", "D-1", {
        title: "I-IV-V on Guitar — feel them under your fingers",
        body: [
          "On guitar: play C → F → C → G → C in slow strums. The IV (F) lifts; the V (G) leans; the I lands.",
          "Repeat until each move’s character is clear before training your ear to recognize them passively.",
        ],
        droneTonicMidi: C_MAJOR.tonicMidi,
        droneKeyLabel: C_MAJOR.keyLabel,
      });
    case "D-2":
      return card("concept-explainer", "D", "D-2", {
        title: "I-IV-V Recognition (you listen)",
        body: [
          "80% of pop, rock, and blues lives in I, IV, V. You’ll be asked which chord just appeared after the I.",
        ],
      });
    case "D-3":
      return card("concept-explainer", "D", "D-3", {
        title: "Add the vi — the ‘sad home’",
        body: [
          "vi is the relative minor of I — same pitch family, darker color. Together with I, IV, V it covers half of popular music.",
        ],
      });
    case "D-5":
      return card("concept-explainer", "D", "D-5", {
        title: "Minor Key Changes",
        body: [
          "In a minor key the home chord is i (minor). Common moves: i → iv, i → v (or V), i → ♭VII, i → ♭VI.",
        ],
      });
    // ─── Track E ────────────────────────────────────────────
    case "E-1":
      return card("concept-explainer", "E", "E-1", {
        title: "Major 2nd — two frets",
        body: [
          "An interval is the distance between two notes. A major 2nd is two semitones — two frets on one string.",
          "Play C, then D on the same string. Listen.",
        ],
      });
    case "E-2":
      return card("concept-explainer", "E", "E-2", {
        title: "Major 3rd — four frets",
        body: ["Four semitones up. Bright. The defining color of major."],
      });
    case "E-3":
      return card("concept-explainer", "E", "E-3", {
        title: "Perfect 4th — five frets",
        body: ["Five semitones. Strong, anchored — the move from a string to its neighbor at the same fret."],
      });
    case "E-4":
      return card("concept-explainer", "E", "E-4", {
        title: "Minor 3rd — three frets",
        body: ["Three semitones. The color of minor."],
      });
    case "E-5":
      return card("concept-explainer", "E", "E-5", {
        title: "Perfect 5th — seven frets",
        body: ["Seven semitones. Open, hovering — power-chord sound."],
      });
    case "E-6":
      return card("concept-explainer", "E", "E-6", {
        title: "Minor 7th — ten frets",
        body: ["Ten semitones. The bluesy ♭7 against the root."],
      });
    case "E-9":
      return card("concept-explainer", "E", "E-9", {
        title: "Hum-Then-Find",
        body: [
          "Hum any pitch. Identify the interval up or down to a known reference, then find that note on the neck.",
        ],
      });
    default:
      return null;
  }
}

/**
 * Practice cards for a level — the session builder picks 1–3 of these per session
 * (randomized) per `rules.md` §7C. Foundation-level explainer is *not* in this list.
 */
export function practiceCardsForLevel(levelId: string): BuiltCard[] {
  switch (levelId) {
    // ─── Track A ────────────────────────────────────────────
    case "A-1":
      return [
        card("scale-explore-play", "A", "A-1", {
          prompt: "Play or hum C anywhere — just sit with home.",
          allowedPitchClasses: [0],
          droneTonicMidi: C_MAJOR.tonicMidi,
          droneKeyLabel: C_MAJOR.keyLabel,
          uiTitle: "Sit with the tonic",
          uiDescription:
            "Drone in C. Find C on any string. No other notes today.",
        }),
        card("functional-ear-mc", "A", "A-1", {
          question: "Which pitch is home in C major?",
          choices: ["C", "G", "E", "A"],
          correctIndex: 0,
          afterText: "C is the tonic — the home pitch you keep returning to.",
        }),
      ];
    case "A-2":
      return [
        card("scale-explore-play", "A", "A-2", {
          prompt: "Play or hum A wherever feels like home.",
          allowedPitchClasses: [9],
          droneTonicMidi: A_MINOR.tonicMidi,
          droneKeyLabel: A_MINOR.keyLabel,
          uiTitle: "Sit with the minor tonic",
          uiDescription: "Drone in A minor. Find A on any string.",
        }),
        card("functional-ear-mc", "A", "A-2", {
          question: "Which pitch is home in A minor?",
          choices: ["A", "C", "E", "G"],
          correctIndex: 0,
          afterText: "A is the tonic of A minor; C is the ♭3, E is the 5.",
        }),
      ];
    case "A-3":
      return [
        card("drone-degree-play", "A", "A-3", {
          prompt: "Drone in C. Play degree 1 (the root).",
          ...C_MAJOR,
          degree: 1,
        }),
        card("functional-ear-mc", "A", "A-3", {
          question: "What is degree 1 also called?",
          choices: ["The root / tonic", "The third", "The fifth", "The leading tone"],
          correctIndex: 0,
          afterText: "Degree 1 is the root — the home pitch of the key.",
        }),
      ];
    case "A-4":
      return [
        card("drone-degree-play", "A", "A-4", {
          prompt: "Drone in C. Play degree 5.",
          ...C_MAJOR,
          degree: 5,
        }),
        card("functional-ear-mc", "A", "A-4", {
          question: "Over a C drone, the 5th is which note?",
          choices: ["G", "F", "E", "A"],
          correctIndex: 0,
          afterText: "G is degree 5 of C major — the stable hover above the root.",
        }),
      ];
    case "A-5":
      return [
        card("drone-degree-play", "A", "A-5", {
          prompt: "Drone in C. Play degree 3.",
          ...C_MAJOR,
          degree: 3,
        }),
        card("functional-ear-mc", "A", "A-5", {
          question: "Major vs. minor is mostly which degree?",
          choices: ["The third", "The fifth", "The seventh", "The fourth"],
          correctIndex: 0,
          afterText: "Major uses a major 3rd; minor uses a flat 3rd.",
        }),
      ];
    case "A-6":
      return [
        card("drone-degree-play", "A", "A-6", {
          prompt: "Drone in A minor. Play degree 1.",
          ...A_MINOR,
          degree: 1,
        }),
        card("drone-degree-play", "A", "A-6", {
          prompt: "Drone in A minor. Play degree 3 (this will be the ♭3).",
          ...A_MINOR,
          degree: 3,
        }),
        card("drone-degree-play", "A", "A-6", {
          prompt: "Drone in A minor. Play degree 5.",
          ...A_MINOR,
          degree: 5,
        }),
      ];
    case "A-7":
      return [
        card("drone-degree-play", "A", "A-7", {
          prompt: "Drone in C. Play degree 7.",
          ...C_MAJOR,
          degree: 7,
        }),
        card("functional-ear-mc", "A", "A-7", {
          question: "The 7th over a major tonic feels…",
          choices: ["restless, leaning toward the root", "fully resolved", "as stable as the 5th", "darker than the ♭3"],
          correctIndex: 0,
          afterText: "The leading tone (degree 7) pulls strongly toward the tonic.",
        }),
      ];
    case "A-8":
      return [
        card("drone-degree-play", "A", "A-8", {
          prompt: "Drone in C. Play degree 4.",
          ...C_MAJOR,
          degree: 4,
        }),
        card("functional-ear-mc", "A", "A-8", {
          question: "Where does the 4th most often resolve?",
          choices: ["Down to the 3rd", "Up to the 5th", "Down to the 1st", "Up to the 7th"],
          correctIndex: 0,
          afterText: "4 → 3 is the classic suspended-to-major resolution.",
        }),
      ];
    case "A-9":
      return [
        card("drone-degree-play", "A", "A-9", {
          prompt: "Drone in C. Play degree 2.",
          ...C_MAJOR,
          degree: 2,
        }),
      ];
    case "A-10":
      return [
        card("drone-degree-play", "A", "A-10", {
          prompt: "Drone in C. Play degree 6.",
          ...C_MAJOR,
          degree: 6,
        }),
      ];
    case "A-11":
      return [
        card("chord-tone-targeting-play", "A", "A-11", {
          prompt: "Solo over the i drone using only A, C, and E.",
          allowedPitchClasses: [9, 0, 4],
          droneTonicMidi: A_MINOR.tonicMidi,
          droneKeyLabel: A_MINOR.keyLabel,
          uiTitle: "Chord tones of i: 1, ♭3, 5",
        }),
      ];
    case "A-12":
      return [
        card("chord-tone-targeting-play", "A", "A-12", {
          prompt: "Add G (♭7) to A, C, E. Solo over the i drone.",
          allowedPitchClasses: [9, 0, 4, 7],
          droneTonicMidi: A_MINOR.tonicMidi,
          droneKeyLabel: A_MINOR.keyLabel,
          uiTitle: "i with ♭7: 1, ♭3, 5, ♭7",
        }),
      ];
    case "A-13":
      return [
        card("chord-tone-targeting-play", "A", "A-13", {
          prompt: "Pentatonic with chord-tone targets: A, C, D, E, G.",
          allowedPitchClasses: [9, 0, 2, 4, 7],
          droneTonicMidi: A_MINOR.tonicMidi,
          droneKeyLabel: A_MINOR.keyLabel,
          uiTitle: "A minor pentatonic — target the chord tones",
        }),
      ];
    case "A-14":
      return [
        card("chord-tone-targeting-play", "A", "A-14", {
          prompt: "Two-chord vamp: feel chord tones moving with the harmony.",
          allowedPitchClasses: [9, 0, 2, 4, 7],
          droneTonicMidi: A_MINOR.tonicMidi,
          droneKeyLabel: A_MINOR.keyLabel,
          uiTitle: "Two-chord vamp",
          uiDescription:
            "While the drone simulates one chord, imagine the second chord and target its 1, ♭3, 5 instead.",
        }),
      ];
    case "A-15":
      return [
        card("chord-change-mc", "A", "A-15", {
          question: "Over a real progression, naming a phrase landing on degree 5 of the V chord — which pitch is that in C major?",
          choices: ["D", "G", "B", "E"],
          correctIndex: 0,
          afterText: "V is G; the 5 of G is D. Real progressions move targets, not just keys.",
        }),
      ];
    case "A-16":
      return [
        card("functional-ear-mc", "A", "A-16", {
          question: "You hear a phrase landing on the 3rd over an unfamiliar key. The phrase…",
          choices: ["sounds bright/major", "sounds dark/minor", "sounds tense", "sounds unresolved"],
          correctIndex: 0,
          afterText: "Degree 3 (major) is the bright color regardless of which key center you’re in.",
        }),
      ];
    // ─── Track B ────────────────────────────────────────────
    case "B-1":
      return [
        card("note-finding-play", "B", "B-1", { noteName: "G", stringIndex: 5, stringDescription: "low E (6th) string" }),
        card("note-finding-play", "B", "B-1", { noteName: "C", stringIndex: 5, stringDescription: "low E (6th) string" }),
        card("note-finding-play", "B", "B-1", { noteName: "F", stringIndex: 5, stringDescription: "low E (6th) string" }),
      ];
    case "B-2":
      return [
        card("note-finding-play", "B", "B-2", { noteName: "G", stringIndex: 4, stringDescription: "A (5th) string" }),
        card("note-finding-play", "B", "B-2", { noteName: "B", stringIndex: 5, stringDescription: "low E (6th) string" }),
        card("note-finding-play", "B", "B-2", { noteName: "D", stringIndex: 4, stringDescription: "A (5th) string" }),
      ];
    case "B-3":
      return [card("note-finding-play", "B", "B-3", { noteName: "C", allStringsLowestFret: true })];
    case "B-4":
      return [card("note-finding-play", "B", "B-4", { noteName: "F", allStringsLowestFret: true })];
    case "B-5":
      return [card("note-finding-play", "B", "B-5", { noteName: "G", allStringsLowestFret: true })];
    case "B-6":
      return [
        card("note-finding-play", "B", "B-6", { noteName: "D", allStringsLowestFret: true }),
        card("note-finding-play", "B", "B-6", { noteName: "A", allStringsLowestFret: true }),
      ];
    case "B-7":
      return [
        card("note-finding-play", "B", "B-7", { noteName: "B", allStringsLowestFret: true }),
        card("note-finding-play", "B", "B-7", { noteName: "F#", allStringsLowestFret: true }),
      ];
    case "B-8":
      return [
        card("note-finding-play", "B", "B-8", { noteName: "C#", allStringsLowestFret: true }),
        card("note-finding-play", "B", "B-8", { noteName: "G#", allStringsLowestFret: true }),
        card("note-finding-play", "B", "B-8", { noteName: "Eb", allStringsLowestFret: true }),
      ];
    case "B-9":
      return [
        card("note-finding-play", "B", "B-9", { noteName: "A#", stringIndex: 3, stringDescription: "D string" }),
        card("note-finding-play", "B", "B-9", { noteName: "Eb", stringIndex: 0, stringDescription: "high e string" }),
        card("note-finding-play", "B", "B-9", { noteName: "F#", stringIndex: 2, stringDescription: "G string" }),
      ];
    case "B-10":
      return [
        card("note-finding-play", "B", "B-10", { noteName: "G#", stringIndex: 1, stringDescription: "B string" }),
        card("note-finding-play", "B", "B-10", { noteName: "Db", stringIndex: 4, stringDescription: "A string" }),
      ];
    // ─── Track C ────────────────────────────────────────────
    case "C-1":
      return [
        card("shape-recall-play", "C", "C-1", {
          title: "A minor — one-octave fragment",
          intro:
            "Play these in order: 5th string open A, 2nd fret B, 3rd fret C — then 4th string open D, 2nd fret E, 3rd fret F — then 3rd string open G, 2nd fret A.",
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
        }),
      ];
    case "C-2":
      return [
        card("shape-recall-play", "C", "C-2", {
          title: "A minor — descending recall",
          intro: "Same shape, descending: 3rd string 2nd fret down to 5th string open.",
          steps: [
            { stringIndex: 2, fret: 2 },
            { stringIndex: 2, fret: 0 },
            { stringIndex: 3, fret: 3 },
            { stringIndex: 3, fret: 2 },
            { stringIndex: 3, fret: 0 },
            { stringIndex: 4, fret: 3 },
            { stringIndex: 4, fret: 2 },
            { stringIndex: 4, fret: 0 },
          ],
        }),
      ];
    case "C-3":
      return [
        card("shape-recall-play", "C", "C-3", {
          title: "A minor pent — Box 1 (low strings)",
          intro: "Two notes per string starting from the 5th fret, low E and A strings.",
          steps: [
            { stringIndex: 5, fret: 5 },
            { stringIndex: 5, fret: 8 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 4, fret: 7 },
            { stringIndex: 3, fret: 5 },
            { stringIndex: 3, fret: 7 },
          ],
        }),
      ];
    case "C-4":
      return [
        card("chord-tone-targeting-play", "C", "C-4", {
          prompt: "Inside Box 1, play only the roots (A’s).",
          allowedPitchClasses: [9],
          droneTonicMidi: A_MINOR.tonicMidi,
          droneKeyLabel: A_MINOR.keyLabel,
          uiTitle: "Box 1 — roots only",
        }),
      ];
    case "C-5":
      return [
        card("chord-tone-targeting-play", "C", "C-5", {
          prompt: "Inside Box 1, target the chord tones: A, C, E (1, ♭3, 5).",
          allowedPitchClasses: [9, 0, 4],
          droneTonicMidi: A_MINOR.tonicMidi,
          droneKeyLabel: A_MINOR.keyLabel,
          uiTitle: "Box 1 — all chord tones",
        }),
      ];
    case "C-6":
      return [
        card("shape-recall-play", "C", "C-6", {
          title: "G major — E-shape chord tones",
          intro: "Root on the 6th string 3rd fret, 5th on the A 5th fret, 3rd on the G 4th fret.",
          steps: [
            { stringIndex: 5, fret: 3 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 2, fret: 4 },
          ],
        }),
      ];
    case "C-7":
      return [
        card("shape-recall-play", "C", "C-7", {
          title: "G minor — E-shape chord tones",
          intro: "Same shape; the 3rd flattens. Root, 5, ♭3.",
          steps: [
            { stringIndex: 5, fret: 3 },
            { stringIndex: 4, fret: 5 },
            { stringIndex: 2, fret: 3 },
          ],
        }),
      ];
    case "C-8":
      return [
        card("shape-recall-play", "C", "C-8", {
          title: "A minor pent — Box 2 (low strings)",
          intro: "From the 8th fret on the 6th string.",
          steps: [
            { stringIndex: 5, fret: 8 },
            { stringIndex: 5, fret: 10 },
            { stringIndex: 4, fret: 8 },
            { stringIndex: 4, fret: 10 },
          ],
        }),
      ];
    case "C-9":
      return [
        card("chord-tone-targeting-play", "C", "C-9", {
          prompt: "Inside Box 2, target A, C, E.",
          allowedPitchClasses: [9, 0, 4],
          droneTonicMidi: A_MINOR.tonicMidi,
          droneKeyLabel: A_MINOR.keyLabel,
          uiTitle: "Box 2 — chord tones",
        }),
      ];
    case "C-10":
      return [
        card("shape-recall-play", "C", "C-10", {
          title: "C major — A-shape chord tones",
          intro: "Root on A 3rd fret; 3rd on D 2nd fret; 5th on G 0 fret (open G).",
          steps: [
            { stringIndex: 4, fret: 3 },
            { stringIndex: 3, fret: 2 },
            { stringIndex: 2, fret: 0 },
          ],
        }),
      ];
    case "C-11":
      return [
        card("shape-recall-play", "C", "C-11", {
          title: "Bridge Box 1 → Box 2",
          intro: "Walk the low E from box 1 into box 2.",
          steps: [
            { stringIndex: 5, fret: 5 },
            { stringIndex: 5, fret: 8 },
            { stringIndex: 5, fret: 10 },
            { stringIndex: 4, fret: 8 },
          ],
        }),
      ];
    case "C-12":
      return [
        card("shape-recall-play", "C", "C-12", {
          title: "D-shape — chord tone landmark",
          intro: "Root, 5, 3 inside a D-shape barre at the 5th fret (G major).",
          steps: [
            { stringIndex: 3, fret: 5 },
            { stringIndex: 2, fret: 7 },
            { stringIndex: 1, fret: 8 },
          ],
        }),
      ];
    // ─── Track D ────────────────────────────────────────────
    case "D-1":
      return [
        card("chord-change-mc", "D", "D-1", {
          question: "You played C → F → C. The middle chord (F) is which function?",
          choices: ["IV", "V", "vi", "I"],
          correctIndex: 0,
          afterText: "F is the IV of C major — the ‘lifted’ sound.",
        }),
        card("chord-change-mc", "D", "D-1", {
          question: "You played C → G → C. The middle chord (G) is which function?",
          choices: ["V", "IV", "vi", "I"],
          correctIndex: 0,
          afterText: "G is the V — leans hard back to the I.",
        }),
      ];
    case "D-2":
      return [
        card("chord-change-mc", "D", "D-2", {
          question: "Over a I drone, you hear a ‘lifted’ chord. Most likely:",
          choices: ["IV", "V", "vi", "ii"],
          correctIndex: 0,
          afterText: "The IV is bright and lifted compared to the I.",
        }),
        card("chord-change-mc", "D", "D-2", {
          question: "Over a I drone, you hear a tense chord wanting to resolve to the I. Most likely:",
          choices: ["V", "IV", "vi", "iii"],
          correctIndex: 0,
          afterText: "V → I is the strongest resolution in a major key.",
        }),
      ];
    case "D-3":
      return [
        card("chord-change-mc", "D", "D-3", {
          question: "After the I, you hear a ‘sad home’ — same key family, darker. Which chord?",
          choices: ["vi", "IV", "V", "ii"],
          correctIndex: 0,
          afterText: "vi is the relative minor — same notes, darker tonal center.",
        }),
      ];
    case "D-4":
      return [
        card("chord-change-mc", "D", "D-4", {
          question: "I → V → vi → IV is the function of which famous progression?",
          choices: ["The four-chords-of-pop", "12-bar blues", "Doo-wop changes", "Authentic cadence"],
          correctIndex: 0,
          afterText: "Half of popular music sits on I-V-vi-IV.",
        }),
      ];
    case "D-5":
      return [
        card("chord-change-mc", "D", "D-5", {
          question: "Home is i. You hear i → ♭VII → i. ♭VII is which chord in A minor?",
          choices: ["G", "F", "E", "D"],
          correctIndex: 0,
          afterText: "♭VII in A minor is G — common in modal/rock minor.",
        }),
      ];
    case "D-6":
      return [
        card("chord-change-mc", "D", "D-6", {
          question: "In a Mayer-style minor groove you hear i → iv → i → V. The V is…",
          choices: [
            "borrowed from the parallel major (dominant pull)",
            "the same as ♭VII",
            "always minor v",
            "the IV transposed",
          ],
          correctIndex: 0,
          afterText: "Pop / Mayer minor often borrows V (major) from the parallel major for dominant pull.",
        }),
      ];
    // ─── Track E ────────────────────────────────────────────
    case "E-1":
      return [intervalCard("E-1", "Major 2nd up from C4", 60, 2, "up", "major 2nd")];
    case "E-2":
      return [intervalCard("E-2", "Major 3rd up from C4", 60, 4, "up", "major 3rd")];
    case "E-3":
      return [intervalCard("E-3", "Perfect 4th up from C4", 60, 5, "up", "perfect 4th")];
    case "E-4":
      return [intervalCard("E-4", "Minor 3rd up from A3", 57, 3, "up", "minor 3rd")];
    case "E-5":
      return [intervalCard("E-5", "Perfect 5th up from D4", 62, 7, "up", "perfect 5th")];
    case "E-6":
      return [intervalCard("E-6", "Minor 7th up from A3", 57, 10, "up", "minor 7th")];
    case "E-7":
      return [
        intervalCard("E-7", "Major 3rd DOWN from G4", 67, 4, "down", "major 3rd"),
        intervalCard("E-7", "Perfect 4th DOWN from C5", 72, 5, "down", "perfect 4th"),
      ];
    case "E-8":
      return [
        intervalCard("E-8", "Perfect 5th up from A3 (cross-string)", 57, 7, "up", "perfect 5th"),
        intervalCard("E-8", "Major 3rd up from D4 (cross-string)", 62, 4, "up", "major 3rd"),
      ];
    case "E-9":
      return [intervalCard("E-9", "Hum any pitch — then play the major 3rd above it.", 60, 4, "up", "major 3rd")];
    case "E-10":
      return [intervalCard("E-10", "Sing a short melody. Then play the first interval you hear.", 60, 7, "up", "perfect 5th")];
    default:
      return [];
  }
}

function intervalCard(
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
