import type { StateCreator } from "zustand";
import type { HostEntry, AppStore } from "../types";
import { t } from "../i18nHelper";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 2000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

// ─── Slice Types ────────────────────────────────────────────────────────────

export type HostsSlice = {
  hosts: HostEntry[];
  addHost: (h: Omit<HostEntry, "id" | "createdAt" | "updatedAt">) => void;
  updateHost: (id: string, patch: Partial<HostEntry>) => void;
  deleteHost: (id: string) => void;
  disableAllHosts: () => void;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createHostsSlice: StateCreator<AppStore, [], [], HostsSlice> = (set, get) => ({
  hosts: [],

  addHost: (h) => {
    const newId = uid();
    set((state) => ({
      hosts: [...state.hosts, { ...h, id: newId, createdAt: now(), updatedAt: now() }],
    }));
    get().addNotification(
      t(get, "notif.hostCreatedTitle"),
      t(get, "notif.hostCreatedDesc", { domain: h.domain }),
      "success"
    );
  },

  updateHost: (id, patch) => {
    const host = get().hosts.find((h) => h.id === id);
    if (host && patch.enabled !== undefined && patch.enabled !== host.enabled) {
      get().addNotification(
        patch.enabled ? t(get, "notif.hostEnabledTitle") : t(get, "notif.hostDisabledTitle"),
        t(get, "notif.hostStatusDesc", {
          domain: host.domain,
          status: patch.enabled ? t(get, "statusEnabled") : t(get, "statusDisabled"),
        }),
        "info"
      );
    }
    set((state) => ({
      hosts: state.hosts.map((h) =>
        h.id === id ? { ...h, ...patch, updatedAt: now() } : h
      ),
    }));
  },

  deleteHost: (id) => {
    const domain = get().hosts.find((h) => h.id === id)?.domain || "Unknown";
    set((state) => ({
      hosts: state.hosts.filter((h) => h.id !== id),
      // Remove from profiles too
      profiles: state.profiles.map((p) => ({
        ...p,
        entryIds: p.entryIds.filter((e) => e !== id),
      })),
    }));
    get().addNotification(
      t(get, "notif.hostDeletedTitle"),
      t(get, "notif.hostDeletedDesc", { domain }),
      "info"
    );
  },

  disableAllHosts: () => {
    const enabledCount = get().hosts.filter((h) => h.enabled).length;
    if (enabledCount === 0) return;
    set((state) => ({
      hosts: state.hosts.map((h) =>
        h.enabled ? { ...h, enabled: false, updatedAt: now() } : h
      ),
    }));
    get().addNotification(
      t(get, "notif.allHostsDisabledTitle"),
      t(get, "notif.allHostsDisabledDesc", { count: enabledCount }),
      "info"
    );
  },
});
