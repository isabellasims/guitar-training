import type { ReviewItem } from "@/lib/domain/types";
import { addCalendarDays } from "@/lib/time/localDate";

export const SRS_INITIAL_EASE = 2.5;
export const SRS_MIN_EASE = 1.3;
export const SRS_MAX_EASE = 2.5;

export function initialReviewItemFields(today: string): Pick<
  ReviewItem,
  "easeFactor" | "intervalDays" | "dueDate" | "consecutiveCorrect" | "totalReviews"
> {
  return {
    easeFactor: SRS_INITIAL_EASE,
    intervalDays: 1,
    dueDate: addCalendarDays(today, 1),
    consecutiveCorrect: 0,
    totalReviews: 0,
  };
}

/** SM-2–style update after a graded review. */
export function nextReviewState(
  prev: ReviewItem,
  correct: boolean,
  today: string,
): Pick<
  ReviewItem,
  | "easeFactor"
  | "intervalDays"
  | "dueDate"
  | "consecutiveCorrect"
  | "totalReviews"
> {
  const totalReviews = prev.totalReviews + 1;
  if (!correct) {
    const easeFactor = Math.max(SRS_MIN_EASE, prev.easeFactor - 0.2);
    return {
      easeFactor,
      intervalDays: 1,
      dueDate: addCalendarDays(today, 1),
      consecutiveCorrect: 0,
      totalReviews,
    };
  }
  const consecutiveCorrect = prev.consecutiveCorrect + 1;
  const easeFactor = Math.min(SRS_MAX_EASE, prev.easeFactor + 0.05);
  const intervalDays = Math.max(
    1,
    Math.round(prev.intervalDays * prev.easeFactor),
  );
  return {
    easeFactor,
    intervalDays,
    dueDate: addCalendarDays(today, intervalDays),
    consecutiveCorrect,
    totalReviews,
  };
}
