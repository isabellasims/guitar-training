import type { ReviewItem, Session, SessionCard } from "@/lib/domain/types";
import { db } from "@/lib/db/index";
import {
  initialReviewItemFields,
  nextReviewState,
} from "@/lib/srs/reviewScheduling";
import { localDateString } from "@/lib/time/localDate";

/** One SRS row per unique card definition (template + track + node + params). */
function stableReviewId(card: SessionCard): string {
  const json = JSON.stringify({
    t: card.cardTemplateId,
    tr: card.trackId,
    n: card.nodeId,
    p: card.parameters,
  });
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return `r-${btoa(bin).replace(/[/+=]/g, "_")}`;
}

export async function getDueReviewCards(limit: number): Promise<ReviewItem[]> {
  const today = localDateString();
  const rows = await db.reviewItems
    .filter((r) => r.dueDate <= today)
    .toArray();
  rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return rows.slice(0, Math.max(0, limit));
}

export function reviewItemToSessionCard(item: ReviewItem): SessionCard {
  return {
    id: crypto.randomUUID(),
    cardTemplateId: item.cardTemplateId,
    trackId: item.trackId,
    nodeId: item.nodeId,
    parameters: { ...item.parameters },
    reviewItemId: item.id,
    startedAt: null,
    completedAt: null,
    grading: "pending",
  };
}

export async function applyReviewOutcomeForCard(
  card: SessionCard,
  grading: SessionCard["grading"],
): Promise<void> {
  if (grading === "pending" || grading === "skipped") return;
  if (card.cardTemplateId === "concept-explainer") return;
  const correct = grading === "correct";
  const today = localDateString();
  const id = card.reviewItemId ?? stableReviewId(card);
  const existing = await db.reviewItems.get(id);
  if (existing) {
    const next = nextReviewState(existing, correct, today);
    await db.reviewItems.put({ ...existing, ...next });
    return;
  }
  const fresh: ReviewItem = {
    id,
    cardTemplateId: card.cardTemplateId,
    trackId: card.trackId,
    nodeId: card.nodeId,
    parameters: structuredClone(card.parameters),
    ...initialReviewItemFields(today),
  };
  const next = nextReviewState(fresh, correct, today);
  await db.reviewItems.put({ ...fresh, ...next });
}

export async function syncReviewAfterCompletedSession(
  session: Session,
): Promise<void> {
  for (const card of session.cards) {
    if (card.grading === "pending") continue;
    await applyReviewOutcomeForCard(card, card.grading);
  }
}
