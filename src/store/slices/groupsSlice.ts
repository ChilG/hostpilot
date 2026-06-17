import type { StateCreator } from "zustand";
import type { HostGroup, AppStore } from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 3000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

// ─── Slice Types ────────────────────────────────────────────────────────────

export type GroupsSlice = {
  groups: HostGroup[];
  addGroup: (g: Omit<HostGroup, "id">) => void;
  updateGroup: (id: string, patch: Partial<HostGroup>) => void;
  deleteGroup: (id: string) => void;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createGroupsSlice: StateCreator<AppStore, [], [], GroupsSlice> = (set) => ({
  groups: [],

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

  deleteGroup: (id) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      // Unassign hosts from deleted group
      hosts: state.hosts.map((h) =>
        h.groupId === id ? { ...h, groupId: undefined, updatedAt: now() } : h
      ),
    }));
  },
});
