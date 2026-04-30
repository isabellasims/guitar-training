import type { BuiltCard } from "@/lib/cards/types";
import type { SessionCard } from "@/lib/domain/types";

export function builtCardToSessionCard(b: BuiltCard): SessionCard {
  return {
    id: b.id,
    cardTemplateId: b.templateId,
    trackId: b.trackId,
    nodeId: b.nodeId,
    parameters: b.parameters as Record<string, unknown>,
    startedAt: null,
    completedAt: null,
    grading: "pending",
  };
}
