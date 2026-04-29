import { defaultSettings, type Streak } from "@/lib/domain/types";
import { getSettings, getStreak, putSettings, putStreak } from "@/lib/db/index";

const emptyStreak: Streak = {
  currentStreak: 0,
  longestStreak: 0,
  lastSessionDate: null,
};

export async function ensureDbSeeded(): Promise<void> {
  const [settings, streak] = await Promise.all([getSettings(), getStreak()]);
  if (!settings) {
    await putSettings(defaultSettings);
  }
  if (!streak) {
    await putStreak(emptyStreak);
  }
}
