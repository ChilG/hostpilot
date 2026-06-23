import type { StateCreator } from "zustand";
import type { AppStore } from "../types";
import { mergeImportedConfig } from "../helpers/importMapper";
import { t } from "../i18nHelper";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 8000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

// ─── Slice Types ────────────────────────────────────────────────────────────

export type ImportSlice = {
  importConfig: (
    config: {
      hosts?: any[];
      groups?: any[];
      profiles?: any[];
      ports?: any[];
      proxyRules?: any[];
    },
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
    if (stats.groupsImported > 0) (patch as any).groups = nextGroups;
    if (stats.hostsImported > 0) (patch as any).hosts = nextHosts;
    if (stats.profilesImported > 0) (patch as any).profiles = nextProfiles;
    if (stats.portsImported > 0) (patch as any).ports = nextPorts;
    if (stats.proxyRulesImported > 0) (patch as any).proxyRules = nextProxyRules;

    if (Object.keys(patch).length > 0) {
      set(patch as any);
    }

    get().addNotification(
      "Configuration Mapped & Imported",
      `Mapped and merged config: ${stats.hostsImported} hosts, ${stats.groupsImported} groups, ${stats.profilesImported} profiles, ${stats.portsImported} port rules, ${stats.proxyRulesImported} proxy rules.`,
      "success"
    );

    return stats;
  },
});
