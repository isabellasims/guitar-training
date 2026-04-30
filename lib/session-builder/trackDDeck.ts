import type { BuiltCard } from "@/lib/cards/types";

export function buildTrackDSamplerDeck(): BuiltCard[] {
  return [
    {
      id: crypto.randomUUID(),
      templateId: "chord-change-mc",
      trackId: "D",
      nodeId: "d-feel-moves",
      parameters: {
        question:
          "In a major key, which move is often described as a “lift” or brighter step up from home?",
        choices: [
          "I moving up to IV",
          "I moving up to V",
          "I moving to vi (minor six)",
          "V moving down to IV",
        ],
        correctIndex: 0,
        afterText:
          "I→IV raises the color — the IV chord sits a fourth above the tonic. I→V adds tension that wants to resolve home.",
      },
    },
    {
      id: crypto.randomUUID(),
      templateId: "chord-change-mc",
      trackId: "D",
      nodeId: "d-add-vi",
      parameters: {
        question:
          "In major, the vi chord is built on which scale degree?",
        choices: [
          "The sixth degree",
          "The fourth degree",
          "The second degree",
          "The flat seventh",
        ],
        correctIndex: 0,
        afterText:
          "vi is the chord on scale degree 6 — it shares two notes with I and adds the bittersweet “relative minor” color.",
      },
    },
  ];
}

/** One quiz for quick sessions. */
export function buildQuickTrackDCard(): BuiltCard[] {
  const first = buildTrackDSamplerDeck()[0];
  if (!first) return [];
  return [{ ...first, id: crypto.randomUUID() }];
}
