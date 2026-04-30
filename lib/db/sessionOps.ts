import type { Session, Streak } from "@/lib/domain/types";
import { db, getStreak, putStreak } from "@/lib/db/index";
import { streakAfterSessionComplete } from "@/lib/streak/updateStreak";
import { localDateString } from "@/lib/time/localDate";

export async function saveCompletedSession(
  session: Session,
): Promise<void> {
  const completed: Session = {
    ...session,
    completedAt: new Date().toISOString(),
  };
  await db.sessions.put(completed);
}

export async function applyStreakForCompletedSession(): Promise<Streak> {
  const prev =
    (await getStreak()) ?? {
      currentStreak: 0,
      longestStreak: 0,
      lastSessionDate: null,
    };
  const next = streakAfterSessionComplete(prev, localDateString());
  await putStreak(next);
  return next;
}
