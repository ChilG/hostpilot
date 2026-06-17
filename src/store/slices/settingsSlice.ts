import type { StateCreator } from "zustand";
import { defaultSettings, type AppSettings, type AppStore } from "../types";
import { applyThemeClass, applyLanguageClass } from "../helpers/themeHelper";

// ─── Slice Types ────────────────────────────────────────────────────────────

export type SettingsSlice = {
  settings: AppSettings;
  onboarded: boolean;
  loading: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setOnboardedComplete: () => void;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createSettingsSlice: StateCreator<AppStore, [], [], SettingsSlice> = (set) => ({
  settings: defaultSettings,
  onboarded: false,
  loading: true,

  updateSettings: (patch: Partial<AppSettings>) => {
    set((state) => {
      const next = { ...state.settings, ...patch };
      if (patch.colorTheme !== undefined) {
        applyThemeClass(patch.colorTheme);
      }
      if (patch.language !== undefined) {
        applyLanguageClass(patch.language);
      }
      return { settings: next };
    });
  },

  setOnboardedComplete: () => set({ onboarded: true }),
});
