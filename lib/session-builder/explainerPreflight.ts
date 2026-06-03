import type { TrackId } from "@/lib/domain/types";
import type { BuiltCard } from "@/lib/cards/types";
import { explainerForLevel } from "@/lib/curriculum/cardsForLevel";
import { needsExplainer } from "@/lib/curriculum/explainerGate";
import {
  currentLevelIdForTrack,
  isTrackEntered,
  type ProgressByTrack,
} from "@/lib/curriculum/prerequisites";

export type PendingExplainer = {
  trackId: TrackId;
  levelId: string;
  explainer: BuiltCard<"concept-explainer">;
};

/** Foundation explainers that must be seen before practice cards run. */
export function pendingFoundationExplainers(
  byTrack: ProgressByTrack,
): PendingExplainer[] {
  const tracks: TrackId[] = ["A", "B", "C", "D", "E", "F"];
  const out: PendingExplainer[] = [];
  for (const trackId of tracks) {
    if (!isTrackEntered(trackId, byTrack)) continue;
    const cur = currentLevelIdForTrack(trackId, byTrack);
    if (!cur) continue;
    if (!needsExplainer(byTrack[trackId], cur)) continue;
    const explainer = explainerForLevel(cur);
    if (!explainer || explainer.templateId !== "concept-explainer") continue;
    out.push({
      trackId,
      levelId: cur,
      explainer: explainer as BuiltCard<"concept-explainer">,
    });
  }
  return out;
}
