import { create } from "zustand";

import { defaultSettings, type Settings } from "@/lib/domain/types";
import { getSettings, putSettings } from "@/lib/db/index";

type SettingsState = {
  settings: Settings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (partial: Partial<Settings>) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  hydrated: false,
  hydrate: async () => {
    const row = await getSettings();
    set({
      settings: row ?? defaultSettings,
      hydrated: true,
    });
  },
  update: async (partial) => {
    const next = { ...get().settings, ...partial };
    await putSettings(next);
    set({ settings: next });
  },
}));
