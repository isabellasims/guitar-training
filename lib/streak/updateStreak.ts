import type { Streak } from "@/lib/domain/types";
import { calendarDaysBetween, localDateString } from "@/lib/time/localDate";

/**
 * Call when the user finishes a session (not per-card).
 * `when` should be local calendar day string if you need consistency; defaults to today local.
 */
export function streakAfterSessionComplete(
  previous: Streak,
  when = localDateString(),
): Streak {
  const last = previous.lastSessionDate;
  if (!last) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, previous.longestStreak),
      lastSessionDate: when,
    };
  }
  if (last === when) {
    return {
      ...previous,
      longestStreak: Math.max(previous.currentStreak, previous.longestStreak),
    };
  }
  const gap = calendarDaysBetween(when, last);
  if (gap === 1) {
    const current = previous.currentStreak + 1;
    return {
      currentStreak: current,
      longestStreak: Math.max(current, previous.longestStreak),
      lastSessionDate: when,
    };
  }
  return {
    currentStreak: 1,
    longestStreak: Math.max(previous.longestStreak, 1),
    lastSessionDate: when,
  };
}
