import type { StateCreator } from "zustand";
import type { HostGroup, AppStore } from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 3000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

// ─── Slice Types ────────────────────────────────────────────────────────────

export type GroupsSlice = {
  groups: HostGroup[];
  highlightedGroupId: string | null;
  setHighlightedGroupId: (id: string | null) => void;
  addGroup: (g: Omit<HostGroup, "id">) => void;
  updateGroup: (id: string, patch: Partial<HostGroup>) => void;
  deleteGroup: (id: string, deleteAssociatedHosts?: boolean) => void;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createGroupsSlice: StateCreator<AppStore, [], [], GroupsSlice> = (set) => ({
  groups: [],
  highlightedGroupId: null,

  setHighlightedGroupId: (id) => {
    set({ highlightedGroupId: id });
  },

  addGroup: (g) => {
    set((state) => ({
      groups: [...state.groups, { ...g, id: uid() }],
    }));
  },

  updateGroup: (id, patch) => {
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  },

  deleteGroup: (id, deleteAssociatedHosts) => {
    set((state) => {
      let nextHosts = state.hosts;
      let nextProfiles = state.profiles;
      if (deleteAssociatedHosts) {
        const hostIdsToDelete = state.hosts.filter((h) => h.groupId === id).map((h) => h.id);
        nextHosts = state.hosts.filter((h) => h.groupId !== id);
        nextProfiles = state.profiles.map((p) => ({
          ...p,
          entryIds: p.entryIds.filter((e) => !hostIdsToDelete.includes(e)),
        }));
      } else {
        nextHosts = state.hosts.map((h) =>
          h.groupId === id ? { ...h, groupId: undefined, updatedAt: now() } : h
        );
      }
      return {
        groups: state.groups.filter((g) => g.id !== id),
        hosts: nextHosts,
        profiles: nextProfiles,
      };
    });
  },
});
