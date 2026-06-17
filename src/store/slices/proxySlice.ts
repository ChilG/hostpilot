import type { StateCreator } from "zustand";
import type { ProxyRule, AppStore } from "../types";
import { apiAdapter } from "../apiAdapter";
import { t } from "../i18nHelper";

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 6000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

// ─── Slice Types ────────────────────────────────────────────────────────────

export type ProxySlice = {
  proxyRules: ProxyRule[];
  proxyRunningPort: number | null;
  caTrusted: boolean;
  addProxyRule: (r: Omit<ProxyRule, "id" | "createdAt" | "updatedAt">) => void;
  updateProxyRule: (id: string, patch: Partial<ProxyRule>) => void;
  deleteProxyRule: (id: string) => void;
  startProxyServer: (port: number) => Promise<void>;
  stopProxyServer: () => Promise<void>;
  checkProxyStatus: () => Promise<void>;
  installRootCa: () => Promise<void>;
  checkCaStatus: () => Promise<void>;
};

// ─── Slice Creator ──────────────────────────────────────────────────────────

export const createProxySlice: StateCreator<AppStore, [], [], ProxySlice> = (set, get) => ({
  proxyRules: [],
  proxyRunningPort: null,
  caTrusted: false,

  addProxyRule: (r) => {
    set((state) => ({
      proxyRules: [
        ...state.proxyRules,
        { ...r, id: uid(), createdAt: now(), updatedAt: now() },
      ],
    }));
  },

  updateProxyRule: (id, patch) => {
    set((state) => ({
      proxyRules: state.proxyRules.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: now() } : r
      ),
    }));
  },

  deleteProxyRule: (id) => {
    set((state) => ({
      proxyRules: state.proxyRules.filter((r) => r.id !== id),
    }));
  },

  startProxyServer: async (port) => {
    try {
      const { sslEnabled, sslPort } = get().settings;
      await apiAdapter.startProxyServer(port, sslEnabled, sslPort);
      set({ proxyRunningPort: port });
      get().addNotification(
        t(get, "notif.proxyStartedTitle"),
        t(get, "notif.proxyStartedDesc", { port }),
        "success"
      );
    } catch (e) {
      console.error("Failed to start proxy:", e);
      get().addNotification(
        t(get, "notif.proxyStartErrorTitle"),
        t(get, "notif.proxyStartErrorDesc", { port, error: String(e) }),
        "error"
      );
      throw e;
    }
  },

  stopProxyServer: async () => {
    try {
      await apiAdapter.stopProxyServer();
      set({ proxyRunningPort: null });
      get().addNotification(
        t(get, "notif.proxyStoppedTitle"),
        t(get, "notif.proxyStoppedDesc"),
        "info"
      );
    } catch (e) {
      console.error("Failed to stop proxy:", e);
      throw e;
    }
  },

  checkProxyStatus: async () => {
    try {
      const port = await apiAdapter.getProxyStatus();
      set({ proxyRunningPort: port });
    } catch (e) {
      console.error("Failed to check proxy status:", e);
    }
  },

  checkCaStatus: async () => {
    try {
      const trusted = await apiAdapter.checkCaStatus();
      set({ caTrusted: trusted });
    } catch (e) {
      console.error("Failed to check CA status:", e);
    }
  },

  installRootCa: async () => {
    try {
      await apiAdapter.installRootCa();
      set({ caTrusted: true });
      get().addNotification(
        t(get, "notif.caInstalledTitle"),
        t(get, "notif.caInstalledDesc"),
        "success"
      );
    } catch (e) {
      console.error("Failed to install Root CA:", e);
      get().addNotification(
        t(get, "notif.caInstallErrorTitle"),
        t(get, "notif.caInstallErrorDesc", { error: String(e) }),
        "error"
      );
      throw e;
    }
  },
});
