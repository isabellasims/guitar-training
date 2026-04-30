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
  | "chord-change-mc";

export type ConceptExplainerParams = {
  title: string;
  body: string[];
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
  /** e.g. "G", "F#". */
  noteName: string;
  stringIndex: StringIndex;
  /** Optional; defaults from string index. */
  stringDescription?: string;
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
  /** When set, card shows an in-lesson tonic drone (no Hz). */
  droneTonicMidi?: number;
  droneKeyLabel?: string;
};

export type CardTemplateParams = {
  "concept-explainer": ConceptExplainerParams;
  "drone-degree-play": DroneDegreePlayParams;
  "functional-ear-mc": FunctionalEarMcParams;
  "note-finding-play": NoteFindingPlayParams;
  "shape-recall-play": ShapeRecallPlayParams;
  "chord-tone-targeting-play": ChordToneTargetingParams;
  "chord-change-mc": ChordChangeMcParams;
};

export type BuiltCard<T extends CardTemplateId = CardTemplateId> = {
  id: string;
  templateId: T;
  trackId: TrackId;
  nodeId: string;
  parameters: CardTemplateParams[T];
};
