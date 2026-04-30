import type {
  BuiltCard,
  DroneDegreePlayParams,
} from "@/lib/cards/types";
import { midiForScaleDegree } from "@/lib/scale/degreeToMidi";

/** Rotating Track A cards for early-phase practice (expand with node progress later). */
export function buildTrackAIntroDeck(): BuiltCard[] {
  const node = "a-hear-tonic";
  return [
    {
      id: crypto.randomUUID(),
      templateId: "concept-explainer",
      trackId: "A",
      nodeId: node,
      parameters: {
        title: "Why the drone matters",
        body: [
          "Before naming scale degrees, your ear needs a place called home — the tonic.",
          "Loop a drone in one key. Listen, hum, let that pitch settle. Then play in-key notes and notice which ones rest and which ones pull.",
          "This is the skill most people skip. Everything in Track A builds on it.",
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      templateId: "functional-ear-mc",
      trackId: "A",
      nodeId: node,
      parameters: {
        question:
          "In a major key, which scale degree is described as “home” or “arrived”?",
        choices: [
          "The root (1)",
          "The fourth",
          "The flat seventh",
          "The second",
        ],
        correctIndex: 0,
        afterText:
          "The root is the tonic — the tonal center. The fourth and seventh create motion; the second is lighter tension.",
      },
    },
    {
      id: crypto.randomUUID(),
      templateId: "drone-degree-play",
      trackId: "A",
      nodeId: "a-stable-fifth",
      parameters: {
        prompt:
          "Drone is in C major. Play the fifth of the key (the “five” scale degree). Any octave is fine.",
        keyLabel: "C major",
        tonicMidi: 60,
        mode: "major",
        degree: 5,
      },
    },
  ];
}

export function buildQuickTrackACard(): BuiltCard[] {
  const node = "a-hear-tonic";
  return [
    {
      id: crypto.randomUUID(),
      templateId: "functional-ear-mc",
      trackId: "A",
      nodeId: node,
      parameters: {
        question: "Which degree is the “color” note that makes major sound major?",
        choices: [
          "The third",
          "The root",
          "The fifth",
          "The fourth",
        ],
        correctIndex: 0,
        afterText:
          "Major versus minor is mostly the third: major uses a major third above the root; minor uses a minor third (flat third).",
      },
    },
  ];
}

export function targetMidiForDroneDegreeCard(
  params: DroneDegreePlayParams,
): number {
  return midiForScaleDegree(params.tonicMidi, params.mode, params.degree);
}
