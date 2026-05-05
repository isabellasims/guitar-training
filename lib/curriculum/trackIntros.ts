import type { BuiltCard } from "@/lib/cards/types";
import type { TrackId } from "@/lib/domain/types";
import type { TrackProgress } from "@/lib/domain/types";

const INTROS: Record<
  TrackId,
  { name: string; tagline: string; body: string[] }
> = {
  A: {
    name: "Scale Degrees",
    tagline: "The spine of the curriculum.",
    body: [
      "Each note in a key has a fixed character — root, third, fifth, leading tone — and that character carries across every key.",
      "Track A trains your ear to hear function instead of measuring distance from the last note. It runs every session.",
    ],
  },
  B: {
    name: "Note Finding",
    tagline: "Pure spatial recall.",
    body: [
      "Independent from your ears: name a note, find it on the neck, fast.",
      "Sessions add a few quick reps — over weeks of small drills you’ll know any note on any string in under two seconds.",
    ],
  },
  C: {
    name: "Fretboard & CAGED",
    tagline: "From one shape to the whole neck.",
    body: [
      "Knowing what note you want is useless without a physical map of where it lives.",
      "We start with one minor scale shape, then pentatonic boxes, then CAGED chord-tone maps so the neck stops being five disconnected boxes.",
    ],
  },
  D: {
    name: "Hearing Chord Changes",
    tagline: "Stay oriented inside real songs.",
    body: [
      "When the chord shifts under you, you should feel which function just appeared — I, IV, V, vi.",
      "Track D enters once you know the root, fifth, and third by ear (after Track A · Level 5).",
    ],
  },
  E: {
    name: "Intervals",
    tagline: "Distance from a known reference.",
    body: [
      "The secondary lens to scale degrees: hear a major third, a perfect fifth, a minor seventh.",
      "Track E enters alongside Track D — pedagogically, scale-degree thinking comes first; intervals reinforce it.",
    ],
  },
};

export function buildTrackIntroCard(
  trackId: TrackId,
  currentLevelId: string,
): BuiltCard<"concept-explainer"> {
  const meta = INTROS[trackId];
  return {
    id: crypto.randomUUID(),
    templateId: "concept-explainer",
    trackId,
    nodeId: currentLevelId,
    parameters: {
      title: `Track ${trackId} — ${meta.name}`,
      body: [meta.tagline, ...meta.body],
    },
  };
}

/**
 * Show the track intro the first time a session pulls cards from the track.
 * Once any level in the track has been seen, the intro is suppressed.
 */
export function shouldShowTrackIntro(
  progress: TrackProgress | undefined,
): boolean {
  if (!progress) return true;
  const counts = progress.levelSessionCounts ?? {};
  return Object.keys(counts).length === 0;
}
