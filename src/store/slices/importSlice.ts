import type { StateCreator } from "zustand";
import type { AppStore, ImportedConfig } from "../types";
import { mergeImportedConfig } from "../helpers/importMapper";
import { t } from "../i18nHelper";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 8000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

// ─── Slice Types ────────────────────────────────────────────────────────────

export type ImportSlice = {
  importConfig: (
    config: ImportedConfig,
    duplicateStrategy?: "skip" | "overwrite" | "duplicate",
    addToActiveProfile?: boolean
  ) => {
    hostsImported: number;
    groupsImported: number;
    profilesImported: number;
    portsImported: number;
    proxyRulesImported: number;
  };
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createImportSlice: StateCreator<AppStore, [], [], ImportSlice> = (set, get) => ({
  importConfig: (configData, duplicateStrategy, addToActiveProfile) => {
    const defaultImportedDesc = t(get, "notif.importedJsonDesc");
    const state = get();
    const {
      nextHosts,
      nextGroups,
      nextProfiles,
      nextPorts,
      nextProxyRules,
      stats,
    } = mergeImportedConfig(
      configData,
      {
        hosts: state.hosts,
        groups: state.groups,
        profiles: state.profiles,
        ports: state.ports,
        proxyRules: state.proxyRules,
      },
      uid,
      now,
      defaultImportedDesc,
      duplicateStrategy,
      addToActiveProfile
    );

    // Apply updates if any changes occurred
    const patch: Partial<AppStore> = {};
    if (stats.groupsImported > 0) patch.groups = nextGroups;
    if (stats.hostsImported > 0) patch.hosts = nextHosts;
    if (stats.profilesImported > 0) patch.profiles = nextProfiles;
    if (stats.portsImported > 0) patch.ports = nextPorts;
    if (stats.proxyRulesImported > 0) patch.proxyRules = nextProxyRules;

    if (Object.keys(patch).length > 0) {
      set(patch);
    }

    get().addNotification(
      t(get, "notif.configImportedTitle"),
      t(get, "notif.configImportedDesc", {
        hosts: String(stats.hostsImported),
        groups: String(stats.groupsImported),
        profiles: String(stats.profilesImported),
        ports: String(stats.portsImported),
        proxyRules: String(stats.proxyRulesImported),
      }),
      "success"
    );

    return stats;
  },
});
