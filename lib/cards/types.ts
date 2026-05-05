import type { TrackId } from "@/lib/domain/types";
import type { StringIndex } from "@/lib/fretboard/model";

/** Card templates used in sessions. */
export type CardTemplateId =
  | "concept-explainer"
  | "drone-degree-play"
  | "drone-degree-identify"
  | "functional-ear-mc"
  | "note-finding-play"
  | "shape-recall-play"
  | "chord-tone-targeting-play"
  | "scale-explore-play"
  | "chord-change-mc"
  | "chord-change-identify"
  | "drone-listen-warmup"
  | "freeplay-afterglow"
  | "interval-play"
  | "interval-identify";

export type ConceptVocabularyTerm = {
  term: string;
  definition: string;
};

export type KeyContext = {
  tonicMidi: number;
  keyLabel: string;
  mode: "major" | "minor";
};

export type ConceptExplainerParams = {
  title: string;
  body: string[];
  /** Plain-English definitions (tonic, root, scale degree, …). */
  terms?: ConceptVocabularyTerm[];
  /** In-card tonic drone — same control as practice cards. */
  droneTonicMidi?: number;
  droneKeyLabel?: string;
  /** Button to hear the seven notes of the key ascending. */
  scaleListen?: { tonicMidi: number; mode: "major" | "minor" };
  /** Button to hear an arbitrary sequence of MIDI notes (e.g. "Hear root and 5th"). */
  customListen?: {
    label: string;
    /** MIDI pitches in order. */
    sequence: number[];
    /** Seconds per note. Defaults to 0.6. */
    noteDurationSec?: number;
    /** Gap between notes. Defaults to 100ms. */
    gapMs?: number;
  };
  /** Button to hear a backing-track-style chord progression (e.g. "Strum C → F → C → G → C"). */
  chordProgressionListen?: {
    label: string;
    /** Each chord: list of MIDI notes that voice the chord. */
    chords: number[][];
    /** Seconds per chord. Defaults to 1.4. */
    chordDurationSec?: number;
  };
  /**
   * Optional fretboard shape to render under the body — used by Track C
   * Foundation explainers (A natural minor shape, pent box 1, etc.) so the
   * user sees the shape and can hear the scale before drilling.
   */
  fretboardShape?: {
    title?: string;
    /** Highest fret to draw (defaults to 8). */
    maxFret?: number;
    steps: ShapeRecallStep[];
    /** Optional color override per step (e.g. "rust" for roots, "gold" for 3rds). */
    colorClasses?: string[];
  };
  /** Custom continue label. Defaults to "Continue". */
  continueLabel?: string;
};

/**
 * Production card: user plays the requested degree(s).
 * `prompts` is a sequence — single-prompt cards have one entry; relationship
 * cards (e.g. root → 5 → root) have multiple. Per-prompt expected pitch
 * classes support multi-target acceptance (e.g. "any chord tone").
 */
export type DroneDegreePlayParams = {
  uiTitle?: string;
  uiDescription?: string;
  keyLabel: string;
  tonicMidi: number;
  mode: "major" | "minor";
  prompts: Array<{
    text: string;
    /** Acceptable pitch classes 0–11; any octave counts. */
    expectedPitchClasses: number[];
  }>;
};

/**
 * Recognition card: a single pitch is auto-played over the drone; user picks
 * which option matches what they heard. All prompts share the same option set
 * but each prompt can switch keys (e.g. A·2·P2 mid-card key swap).
 */
export type DroneDegreeIdentifyParams = {
  uiTitle?: string;
  uiDescription?: string;
  /** Buttons shown for every prompt. */
  options: Array<{ label: string }>;
  prompts: Array<{
    key: KeyContext;
    /** Pitch class 0–11 that auto-plays over the drone. */
    playedPitchClass: number;
    /** Which `options` index is correct for this prompt. */
    correctOptionIndex: number;
    /** Mid-card transition copy shown before the prompt (e.g. key change). */
    transitionText?: string;
  }>;
};

export type FunctionalEarMcParams = {
  question: string;
  choices: string[];
  /** Index of correct choice. */
  correctIndex: number;
  /** Short rationale after answer. */
  afterText: string;
};

/** Track D legacy single-prompt MC. */
export type ChordChangeMcParams = FunctionalEarMcParams;

/**
 * Recognition card: synth chord progression auto-plays, then asks the user
 * which function (I/IV/V/vi/i/iv/V/♭VII/♭VI) was the Nth chord.
 */
export type ChordChangeIdentifyParams = {
  uiTitle?: string;
  uiDescription?: string;
  /** Buttons shown for every prompt. */
  options: Array<{ label: string }>;
  prompts: Array<{
    keyLabel: string;
    /** Chords as MIDI voicings, played in order. */
    chords: number[][];
    /** 1-indexed position the user must identify. */
    askPositionIndex: number;
    /** Optional pre-prompt text (e.g. "Listen for the 3rd chord."). */
    transitionText?: string;
    /** Index into `options` that is correct. */
    correctOptionIndex: number;
    /** Friendly chord-name mapping for the after-feedback. */
    chordNames?: string[];
  }>;
};

export type NoteFindingPlayParams = {
  /** e.g. "C", "G". Used when `pool` is not set. */
  noteName?: string;
  /** Required when `allStringsLowestFret` is not true and `pool` is not set. */
  stringIndex?: StringIndex;
  stringDescription?: string;
  /**
   * When true: six steps, 6th string → 1st, lowest frets in 0–12 for `noteName`.
   */
  allStringsLowestFret?: boolean;
  /**
   * Random-rounds mode. The card draws `roundCount` prompts, picking a random
   * note from `pool.notes` and a random string from `pool.stringIndices`.
   */
  pool?: {
    notes: string[];
    stringIndices?: StringIndex[];
  };
  roundCount?: number;
  /** When true, each round shows a 2s countdown — fail if not played in time. */
  speedTimerSec?: number;
};

export type ShapeRecallStep = {
  stringIndex: StringIndex;
  fret: number;
};

export type ShapeRecallPlayParams = {
  title: string;
  intro: string;
  steps: ShapeRecallStep[];
  /** When true, a wrong note resets to step 1. Defaults to true for sequences > 1. */
  restartOnError?: boolean;
};

export type ChordToneTargetingParams = {
  prompt: string;
  /** Pitch classes 0–11; any octave counts as correct. */
  allowedPitchClasses: number[];
  droneTonicMidi?: number;
  droneKeyLabel?: string;
  /** Overrides default “Chord tones” header when set. */
  uiTitle?: string;
  uiDescription?: string;
};

/** Same payload as chord-tone; used before “chord tone” language in Track A. */
export type ScaleExplorePlayParams = ChordToneTargetingParams;

/** 30-second tonic drone listen at the start of a session (Slot 1 fallback). */
export type DroneListenWarmupParams = {
  tonicMidi: number;
  keyLabel: string;
  /** Suggested listen seconds; UI may default. */
  durationSec?: number;
};

/** Slot 9 freeplay. Backing is a plain drone; later replaceable with a backing track. */
export type FreeplayAfterglowParams = {
  tonicMidi: number;
  keyLabel: string;
  /** Suggested play seconds; UI may default to 90. */
  durationSec?: number;
  prompt?: string;
};

/** Track E intervals (production): pitch-graded ascending or descending interval play. */
export type IntervalPlayParams = {
  /** Plain instruction; e.g. "Play a major 3rd up from C4." */
  prompt: string;
  /** Reference MIDI to start from (the user hears it first). */
  baseMidi: number;
  /** Semitones (e.g. 4 = major 3rd). */
  semitones: number;
  direction: "up" | "down";
  /** Friendly interval label, e.g. "major 3rd". */
  label: string;
};

/** Track E intervals (recognition): hear two notes, pick the interval. */
export type IntervalIdentifyParams = {
  uiTitle?: string;
  uiDescription?: string;
  options: Array<{ label: string }>;
  prompts: Array<{
    /** Reference MIDI played first. */
    baseMidi: number;
    /** Semitones offset from base. Negative = descending. */
    semitones: number;
    direction: "up" | "down";
    /** Index into `options` that's correct. */
    correctOptionIndex: number;
    /** Friendly label of the actual interval, used for feedback. */
    actualLabel: string;
  }>;
};

export type CardTemplateParams = {
  "concept-explainer": ConceptExplainerParams;
  "drone-degree-play": DroneDegreePlayParams;
  "drone-degree-identify": DroneDegreeIdentifyParams;
  "functional-ear-mc": FunctionalEarMcParams;
  "note-finding-play": NoteFindingPlayParams;
  "shape-recall-play": ShapeRecallPlayParams;
  "chord-tone-targeting-play": ChordToneTargetingParams;
  "scale-explore-play": ScaleExplorePlayParams;
  "chord-change-mc": ChordChangeMcParams;
  "chord-change-identify": ChordChangeIdentifyParams;
  "drone-listen-warmup": DroneListenWarmupParams;
  "freeplay-afterglow": FreeplayAfterglowParams;
  "interval-play": IntervalPlayParams;
  "interval-identify": IntervalIdentifyParams;
};

export type BuiltCard<T extends CardTemplateId = CardTemplateId> = {
  id: string;
  templateId: T;
  trackId: TrackId;
  /** Level id (e.g. "A-7"). */
  nodeId: string;
  parameters: CardTemplateParams[T];
};
