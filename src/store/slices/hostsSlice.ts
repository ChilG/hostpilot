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
  enableAllHosts: () => void;
  toggleGroupHosts: (groupId: string, enabled: boolean) => void;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createHostsSlice: StateCreator<AppStore, [], [], HostsSlice> = (set, get) => ({
  hosts: [],

  addHost: (h) => {
    const newId = uid();
    set((state) => ({
      hosts: [...state.hosts, { ...h, id: newId, createdAt: now(), updatedAt: now() }],
    }));

    // Automatically add to active profile if one is active and not already covered by group
    const activeProfile = get().profiles.find((p) => p.active);
    if (activeProfile) {
      const isCoveredByGroup = h.groupId ? activeProfile.groupIds.includes(h.groupId) : false;
      if (!isCoveredByGroup) {
        const updatedEntryIds = [...(activeProfile.entryIds || []), newId];
        get().updateProfile(activeProfile.id, {
          entryIds: updatedEntryIds,
        });
      }
    }

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

  enableAllHosts: () => {
    const disabledCount = get().hosts.filter((h) => !h.enabled).length;
    if (disabledCount === 0) return;
    set((state) => ({
      hosts: state.hosts.map((h) =>
        !h.enabled ? { ...h, enabled: true, updatedAt: now() } : h
      ),
    }));
    get().addNotification(
      t(get, "notif.allHostsEnabledTitle"),
      t(get, "notif.allHostsEnabledDesc", { count: disabledCount }),
      "info"
    );
  },

  toggleGroupHosts: (groupId, enabled) => {
    const groupHosts = get().hosts.filter((h) => h.groupId === groupId);
    const targetCount = groupHosts.filter((h) => h.enabled !== enabled).length;
    if (targetCount === 0) return;

    set((state) => ({
      hosts: state.hosts.map((h) =>
        h.groupId === groupId ? { ...h, enabled, updatedAt: now() } : h
      ),
    }));

    // Find group name
    const group = get().groups.find((g) => g.id === groupId);
    const groupName = group ? group.name : "Unknown Group";

    get().addNotification(
      enabled ? t(get, "notif.groupHostsEnabledTitle") : t(get, "notif.groupHostsDisabledTitle"),
      t(get, "notif.groupHostsStatusDesc", {
        groupName,
        count: targetCount,
        status: enabled ? t(get, "statusEnabled") : t(get, "statusDisabled"),
      }),
      "info"
    );
  },
});
