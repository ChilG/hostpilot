import type { StateCreator } from "zustand";
import type { HostProfile, AppStore } from "../types";
import { t } from "../i18nHelper";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 4000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

// ─── Slice Types ────────────────────────────────────────────────────────────

export type ProfilesSlice = {
  profiles: HostProfile[];
  addProfile: (p: Omit<HostProfile, "id" | "createdAt" | "updatedAt">) => void;
  updateProfile: (id: string, patch: Partial<HostProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => void;
  activateProfile: (id: string) => void;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createProfilesSlice: StateCreator<AppStore, [], [], ProfilesSlice> = (set, get) => ({
  profiles: [],

  addProfile: (p) => {
    set((state) => ({
      profiles: [
        ...state.profiles,
        { ...p, id: uid(), createdAt: now(), updatedAt: now() },
      ],
    }));
  },

  updateProfile: (id, patch) => {
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: now() } : p
      ),
    }));
  },

  deleteProfile: (id) => {
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== id),
    }));
  },

  duplicateProfile: (id) => {
    const src = get().profiles.find((p) => p.id === id);
    if (!src) return;
    set((state) => ({
      profiles: [
        ...state.profiles,
        {
          ...src,
          id: uid(),
          name: `Copy of ${src.name}`,
          active: false,
          favorite: false,
          createdAt: now(),
          updatedAt: now(),
        },
      ],
    }));
  },

  activateProfile: (id) => {
    const name = get().profiles.find((p) => p.id === id)?.name || "Unknown";
    set((state) => ({
      profiles: state.profiles.map((p) => ({
        ...p,
        active: p.id === id,
        updatedAt: now(),
      })),
    }));
    get().addNotification(
      t(get, "notif.profileActivatedTitle"),
      t(get, "notif.profileActivatedDesc", { name }),
      "success"
    );
  },
});
