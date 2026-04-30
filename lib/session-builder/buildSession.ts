import type { Session, SessionCard } from "@/lib/domain/types";
import {
  getDueReviewCards,
  reviewItemToSessionCard,
} from "@/lib/db/reviewOps";
import { buildQuickTrackACard, buildTrackAIntroDeck } from "@/lib/session-builder/trackADeck";
import { builtCardToSessionCard } from "@/lib/session-builder/sessionCardMap";
import { buildTrackBCSamplerDeck } from "@/lib/session-builder/trackBCDeck";
import {
  buildQuickTrackDCard,
  buildTrackDSamplerDeck,
} from "@/lib/session-builder/trackDDeck";

export async function buildNewSession(options: {
  quick: boolean;
}): Promise<Session> {
  const dueLimit = options.quick ? 1 : 2;
  const due = await getDueReviewCards(dueLimit);
  const reviewCards: SessionCard[] = due.map(reviewItemToSessionCard);
  const coreBuilt = options.quick
    ? [...buildQuickTrackACard(), ...buildQuickTrackDCard()]
    : [
        ...buildTrackAIntroDeck(),
        ...buildTrackBCSamplerDeck(),
        ...buildTrackDSamplerDeck(),
      ];
  const coreCards = coreBuilt.map(builtCardToSessionCard);
  const cards = [...reviewCards, ...coreCards];
  const startedAt = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    startedAt,
    completedAt: null,
    cards,
  };
}
