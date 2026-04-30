import type { TrackId } from "@/lib/domain/types";
import type { StringIndex } from "@/lib/fretboard/model";

/** Card templates used in sessions. */
export type CardTemplateId =
  | "concept-explainer"
  | "drone-degree-play"
  | "functional-ear-mc"
  | "note-finding-play"
  | "shape-recall-play"
  | "chord-tone-targeting-play"
  | "scale-explore-play"
  | "chord-change-mc"
  | "drone-listen-warmup"
  | "freeplay-afterglow"
  | "interval-play";

export type ConceptVocabularyTerm = {
  term: string;
  definition: string;
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
};

export type DroneDegreePlayParams = {
  /** Plain instruction shown above the neck. */
  prompt: string;
  keyLabel: string;
  tonicMidi: number;
  mode: "major" | "minor";
  /** Scale degree 1–7. */
  degree: number;
};

export type FunctionalEarMcParams = {
  question: string;
  choices: string[];
  /** Index of correct choice. */
  correctIndex: number;
  /** Short rationale after answer. */
  afterText: string;
};

/** Track D: Roman-numeral / function multiple choice (same shape as ear MC). */
export type ChordChangeMcParams = FunctionalEarMcParams;

export type NoteFindingPlayParams = {
  /** e.g. "C", "G". */
  noteName: string;
  /** Required when `allStringsLowestFret` is not true. */
  stringIndex?: StringIndex;
  stringDescription?: string;
  /**
   * When true: six steps, 6th string → 1st, lowest frets in 0–12 for `noteName`.
   */
  allStringsLowestFret?: boolean;
};

export type ShapeRecallStep = {
  stringIndex: StringIndex;
  fret: number;
};

export type ShapeRecallPlayParams = {
  title: string;
  intro: string;
  steps: ShapeRecallStep[];
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

/** Track E intervals: pitch-graded ascending or descending interval play. */
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

export type CardTemplateParams = {
  "concept-explainer": ConceptExplainerParams;
  "drone-degree-play": DroneDegreePlayParams;
  "functional-ear-mc": FunctionalEarMcParams;
  "note-finding-play": NoteFindingPlayParams;
  "shape-recall-play": ShapeRecallPlayParams;
  "chord-tone-targeting-play": ChordToneTargetingParams;
  "scale-explore-play": ScaleExplorePlayParams;
  "chord-change-mc": ChordChangeMcParams;
  "drone-listen-warmup": DroneListenWarmupParams;
  "freeplay-afterglow": FreeplayAfterglowParams;
  "interval-play": IntervalPlayParams;
};

export type BuiltCard<T extends CardTemplateId = CardTemplateId> = {
  id: string;
  templateId: T;
  trackId: TrackId;
  /** Level id (e.g. "A-7"). */
  nodeId: string;
  parameters: CardTemplateParams[T];
};
