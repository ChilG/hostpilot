import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { translations } from "@/i18n/translations";
import {
  isTauri,
  defaultSettings,
  initialHosts,
  initialGroups,
  initialProfiles,
  initialPorts,
  initialBackups,
  type AppNotification,
  type ProxyRule,
  type AppSettings,
  type AppStore,
  type HostEntry,
  type HostGroup,
  type HostProfile,
  type PortRule,
  type Backup,
} from "./types";
import { apiAdapter } from "./apiAdapter";
import { applyThemeClass, applyLanguageClass } from "./helpers/themeHelper";
import { mergeImportedConfig } from "./helpers/importMapper";

// Re-export types and settings to maintain API backward compatibility
export { isTauri, defaultSettings };
export type { AppNotification, ProxyRule, AppSettings, AppStore, HostEntry, HostGroup, HostProfile, PortRule, Backup };

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 1000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substring(2, 11)}`;
const now = () => new Date().toISOString();

// ─── Context ────────────────────────────────────────────────────────────────

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [hosts, setHosts] = useState<HostEntry[]>([]);
  const [groups, setGroups] = useState<HostGroup[]>([]);
  const [profiles, setProfiles] = useState<HostProfile[]>([]);
  const [ports, setPorts] = useState<PortRule[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [onboarded, setOnboarded] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [proxyRules, setProxyRules] = useState<ProxyRule[]>([]);
  const [proxyRunningPort, setProxyRunningPort] = useState<number | null>(null);
  const [caTrusted, setCaTrusted] = useState(false);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const lang = settings.language || "en";
    const dict = translations[lang] || translations.en;
    let text = dict[key] || translations.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }
    return text;
  };

  // ─── Initialization ────────────────────────────────────────────────────────

  useEffect(() => {
    async function initStore() {
      try {
        const config = await apiAdapter.loadAppConfig();
        if (config) {
          setHosts(config.hosts || []);
          setGroups(config.groups || []);
          setProfiles(config.profiles || []);
          setPorts(config.ports || []);
          setBackups(config.backups || []);
          setOnboarded(config.onboarded || false);
          setNotifications(config.notifications || []);
          setProxyRules(config.proxyRules || []);
          
          if (isTauri) {
            try {
              const runningPort = await apiAdapter.getProxyStatus();
              setProxyRunningPort(runningPort);
            } catch (e) {
              console.error("Failed to load proxy status on init:", e);
            }

            try {
              const trusted = await apiAdapter.checkCaStatus();
              setCaTrusted(trusted);
            } catch (e) {
              console.error("Failed to load CA status on init:", e);
            }
          }

          let initialSettings = config.settings || defaultSettings;
          if (isTauri) {
            try {
              const defaultPath = await apiAdapter.getDefaultHostsPath();
              initialSettings = { ...initialSettings, hostsPath: defaultPath };
            } catch (e) {
              console.error("Failed to load default hosts path:", e);
            }
            try {
              const defaultBackupPath = await apiAdapter.getDefaultBackupsPath();
              if (!initialSettings.backupDirectory || initialSettings.backupDirectory === "~/.hostpilot/backups") {
                initialSettings = { ...initialSettings, backupDirectory: defaultBackupPath };
              }
            } catch (e) {
              console.error("Failed to load default backups path:", e);
            }
          }
          setSettings(initialSettings);
        } else {
          // Seed defaults first time
          setHosts(initialHosts);
          setGroups(initialGroups);
          setProfiles(initialProfiles);
          setPorts(initialPorts);
          setBackups(initialBackups);
          setOnboarded(false);
          let initialSettings = defaultSettings;
          let lang: "en" | "th" = "en";

          if (isTauri) {
            try {
              const sysLocale = await apiAdapter.getSystemLocale();
              if (sysLocale.toLowerCase().startsWith("th")) {
                initialSettings = { ...initialSettings, language: "th" };
                lang = "th";
              }
            } catch (err) {
              console.error("Failed to detect system locale:", err);
            }
            try {
              const defaultPath = await apiAdapter.getDefaultHostsPath();
              initialSettings = { ...initialSettings, hostsPath: defaultPath };
            } catch (e) {
              console.error("Failed to load default hosts path:", e);
            }
            try {
              const defaultBackupPath = await apiAdapter.getDefaultBackupsPath();
              initialSettings = { ...initialSettings, backupDirectory: defaultBackupPath };
            } catch (e) {
              console.error("Failed to load default backups path:", e);
            }
          } else {
            if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("th")) {
              initialSettings = { ...defaultSettings, language: "th" };
              lang = "th";
            }
          }

          const initialTitle = lang === "th" ? "ยินดีต้อนรับสู่ Host Pilot!" : "Welcome to Host Pilot!";
          const initialDesc = lang === "th" 
            ? "ติดตั้งโปรแกรมเรียบร้อยแล้ว พร้อมให้คุณจัดการโฮสต์และพอร์ตอย่างง่ายดาย" 
            : "App successfully installed. Ready to manage hosts and ports.";

          setNotifications([
            {
              id: "init_notif",
              title: initialTitle,
              description: initialDesc,
              type: "success",
              timestamp: new Date().toISOString(),
              unread: true,
            }
          ]);
          setSettings(initialSettings);
        }
      } catch (err) {
        console.error("Failed to load configuration:", err);
      } finally {
        setLoading(false);
      }
    }
    initStore();
  }, []);

  // ─── Auto-Save Effect ──────────────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;

    async function saveStore() {
      const config = { hosts, groups, profiles, ports, backups, onboarded, settings, notifications, proxyRules };
      try {
        await apiAdapter.saveAppConfig(config);
      } catch (err) {
        console.error("Failed to save configuration:", err);
      }
    }
    saveStore();
  }, [hosts, groups, profiles, ports, backups, onboarded, loading, settings, notifications, proxyRules]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.colorTheme !== undefined) {
        applyThemeClass(patch.colorTheme);
      }
      if (patch.language !== undefined) {
        applyLanguageClass(patch.language);
      }
      return next;
    });
  };

  // Set settings classes on startup
  useEffect(() => {
    if (!loading) {
      applyThemeClass(settings.colorTheme);
      applyLanguageClass(settings.language);
    }
  }, [settings.colorTheme, settings.language, loading]);

  // ── Hosts ──
  const addHost = (h: Omit<HostEntry, "id" | "createdAt" | "updatedAt">) => {
    const newId = uid();
    setHosts((prev) => [
      ...prev,
      { ...h, id: newId, createdAt: now(), updatedAt: now() },
    ]);
    addNotification(t("notif.hostCreatedTitle"), t("notif.hostCreatedDesc", { domain: h.domain }), "success");
  };

  const updateHost = (id: string, patch: Partial<HostEntry>) =>
    setHosts((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          if (patch.enabled !== undefined && patch.enabled !== h.enabled) {
            addNotification(
              patch.enabled ? t("notif.hostEnabledTitle") : t("notif.hostDisabledTitle"),
              t("notif.hostStatusDesc", { domain: h.domain, status: patch.enabled ? t("statusEnabled") : t("statusDisabled") }),
              "info"
            );
          }
          return { ...h, ...patch, updatedAt: now() };
        }
        return h;
      })
    );

  const deleteHost = (id: string) => {
    const domain = hosts.find((h) => h.id === id)?.domain || "Unknown";
    setHosts((prev) => prev.filter((h) => h.id !== id));
    // Remove from profiles too
    setProfiles((prev) =>
      prev.map((p) => ({ ...p, entryIds: p.entryIds.filter((e) => e !== id) }))
    );
    addNotification(t("notif.hostDeletedTitle"), t("notif.hostDeletedDesc", { domain }), "info");
  };

  const disableAllHosts = () => {
    const enabledCount = hosts.filter((h) => h.enabled).length;
    if (enabledCount === 0) return;
    setHosts((prev) =>
      prev.map((h) => (h.enabled ? { ...h, enabled: false, updatedAt: now() } : h))
    );
    addNotification(t("notif.allHostsDisabledTitle"), t("notif.allHostsDisabledDesc", { count: enabledCount }), "info");
  };

  // ── Groups ──
  const addGroup = (g: Omit<HostGroup, "id">) =>
    setGroups((prev) => [...prev, { ...g, id: uid() }]);

  const updateGroup = (id: string, patch: Partial<HostGroup>) =>
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g))
    );

  const deleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    // Unassign hosts from deleted group
    setHosts((prev) =>
      prev.map((h) =>
        h.groupId === id ? { ...h, groupId: undefined, updatedAt: now() } : h
      )
    );
  };

  // ── Profiles ──
  const addProfile = (
    p: Omit<HostProfile, "id" | "createdAt" | "updatedAt">
  ) =>
    setProfiles((prev) => [
      ...prev,
      { ...p, id: uid(), createdAt: now(), updatedAt: now() },
    ]);

  const updateProfile = (id: string, patch: Partial<HostProfile>) =>
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: now() } : p
      )
    );

  const deleteProfile = (id: string) =>
    setProfiles((prev) => prev.filter((p) => p.id !== id));

  const duplicateProfile = (id: string) => {
    const src = profiles.find((p) => p.id === id);
    if (!src) return;
    setProfiles((prev) => [
      ...prev,
      {
        ...src,
        id: uid(),
        name: `Copy of ${src.name}`,
        active: false,
        favorite: false,
        createdAt: now(),
        updatedAt: now(),
      },
    ]);
  };

  const activateProfile = (id: string) => {
    const name = profiles.find((p) => p.id === id)?.name || "Unknown";
    setProfiles((prev) =>
      prev.map((p) => ({ ...p, active: p.id === id, updatedAt: now() }))
    );
    addNotification(t("notif.profileActivatedTitle"), t("notif.profileActivatedDesc", { name }), "success");
  };

  // ── Ports ──
  const addPort = (p: Omit<PortRule, "id">) =>
    setPorts((prev) => [...prev, { ...p, id: uid() }]);

  const updatePort = (id: string, patch: Partial<PortRule>) =>
    setPorts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );

  const deletePort = (id: string) =>
    setPorts((prev) => prev.filter((p) => p.id !== id));

  const checkPortLive = async (id: string, host: string, port: number): Promise<boolean> => {
    let isOpen = false;
    try {
      isOpen = await apiAdapter.checkPort(host, port);
      setPorts((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const oldStatus = p.status;
            const newStatus = isOpen ? "running" : "stopped";
            if (oldStatus === "running" && newStatus === "stopped") {
              addNotification(
                t("notif.portDownTitle"),
                t("notif.portDownDesc", { domain: p.domain, port: p.port }),
                "error"
              );
              if (settings.portStatusAlerts) {
                toast.error(t("notif.portDownToastTitle", { domain: p.domain, port: p.port }), {
                  description: t("notif.portDownToastDesc", { host: p.targetHost }),
                });
              }
            }
            return { ...p, status: newStatus };
          }
          return p;
        })
      );
    } catch (e) {
      console.error("Failed to check port status:", e);
    }
    return isOpen;
  };

  // ── Proxy Rules ──
  const addProxyRule = (r: Omit<ProxyRule, "id" | "createdAt" | "updatedAt">) => {
    setProxyRules((prev) => [
      ...prev,
      { ...r, id: uid(), createdAt: now(), updatedAt: now() },
    ]);
  };

  const updateProxyRule = (id: string, patch: Partial<ProxyRule>) => {
    setProxyRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r))
    );
  };

  const deleteProxyRule = (id: string) => {
    setProxyRules((prev) => prev.filter((r) => r.id !== id));
  };

  const startProxyServer = async (port: number) => {
    try {
      await apiAdapter.startProxyServer(port, settings.sslEnabled, settings.sslPort);
      setProxyRunningPort(port);
      addNotification(
        t("notif.proxyStartedTitle"),
        t("notif.proxyStartedDesc", { port }),
        "success"
      );
    } catch (e) {
      console.error("Failed to start proxy:", e);
      addNotification(
        t("notif.proxyStartErrorTitle"),
        t("notif.proxyStartErrorDesc", { port, error: String(e) }),
        "error"
      );
      throw e;
    }
  };

  const stopProxyServer = async () => {
    try {
      await apiAdapter.stopProxyServer();
      setProxyRunningPort(null);
      addNotification(
        t("notif.proxyStoppedTitle"),
        t("notif.proxyStoppedDesc"),
        "info"
      );
    } catch (e) {
      console.error("Failed to stop proxy:", e);
      throw e;
    }
  };

  const checkProxyStatus = async () => {
    try {
      const port = await apiAdapter.getProxyStatus();
      setProxyRunningPort(port);
    } catch (e) {
      console.error("Failed to check proxy status:", e);
    }
  };

  const checkCaStatus = async () => {
    try {
      const trusted = await apiAdapter.checkCaStatus();
      setCaTrusted(trusted);
    } catch (e) {
      console.error("Failed to check CA status:", e);
    }
  };

  const installRootCa = async () => {
    try {
      await apiAdapter.installRootCa();
      setCaTrusted(true);
      addNotification(
        t("notif.caInstalledTitle"),
        t("notif.caInstalledDesc"),
        "success"
      );
    } catch (e) {
      console.error("Failed to install Root CA:", e);
      addNotification(
        t("notif.caInstallErrorTitle"),
        t("notif.caInstallErrorDesc", { error: String(e) }),
        "error"
      );
      throw e;
    }
  };

  // ── Backups ──
  const addBackup = async (reason: string): Promise<Backup> => {
    let record: Backup;
    try {
      record = await apiAdapter.backupHostsFile(reason);
    } catch (err) {
      console.error("Backup failed:", err);
      throw err;
    }

    setBackups((prev) => {
      let next = [record, ...prev];
      if (settings.autoCleanupBackups && settings.keepBackupsCount > 0) {
        if (next.length > settings.keepBackupsCount) {
          const itemsToPrune = next.slice(settings.keepBackupsCount);
          for (const item of itemsToPrune) {
            apiAdapter.deleteBackupFile(item.id).catch((e) =>
              console.error("Failed to delete pruned backup file:", e)
            );
          }
          next = next.slice(0, settings.keepBackupsCount);
        }
      }
      return next;
    });

    addNotification(t("notif.backupCreatedTitle"), t("notif.backupCreatedDesc", { reason }), "success");
    return record;
  };

  const deleteBackup = async (id: string) => {
    try {
      await apiAdapter.deleteBackupFile(id);
    } catch (err) {
      console.error("Failed to delete backup file physically:", err);
    }
    setBackups((prev) => prev.filter((b) => b.id !== id));
  };

  const restoreBackup = async (id: string): Promise<void> => {
    const reason = backups.find((b) => b.id === id)?.reason || "Unknown";
    await apiAdapter.restoreBackup(id);
    addNotification(t("notif.backupRestoredTitle"), t("notif.backupRestoredDesc", { reason }), "success");
  };

  const addNotification = (
    title: string,
    description: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ) => {
    setNotifications((prev) => {
      const newNotif: AppNotification = {
        id: uid(),
        title,
        description,
        type,
        timestamp: now(),
        unread: true,
      };
      return [newNotif, ...prev].slice(0, 50);
    });
  };

  const clearNotifications = () => setNotifications([]);

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => (n.unread ? { ...n, unread: false } : n))
    );
  };

  const importConfig = (configData: {
    hosts?: any[];
    groups?: any[];
    profiles?: any[];
    ports?: any[];
    proxyRules?: any[];
  }) => {
    const defaultImportedDesc = t("notif.importedJsonDesc");
    const {
      nextHosts,
      nextGroups,
      nextProfiles,
      nextPorts,
      nextProxyRules,
      stats,
    } = mergeImportedConfig(
      configData,
      { hosts, groups, profiles, ports, proxyRules },
      uid,
      now,
      defaultImportedDesc
    );

    // Apply updates synchronously if any changes occurred
    if (stats.groupsImported > 0) setGroups(nextGroups);
    if (stats.hostsImported > 0) setHosts(nextHosts);
    if (stats.profilesImported > 0) setProfiles(nextProfiles);
    if (stats.portsImported > 0) setPorts(nextPorts);
    if (stats.proxyRulesImported > 0) setProxyRules(nextProxyRules);

    addNotification(
      "Configuration Mapped & Imported",
      `Mapped and merged config: ${stats.hostsImported} hosts, ${stats.groupsImported} groups, ${stats.profilesImported} profiles, ${stats.portsImported} port rules, ${stats.proxyRulesImported} proxy rules.`,
      "success"
    );

    return stats;
  };

  const setOnboardedComplete = () => setOnboarded(true);

  return (
    <AppStoreContext.Provider
      value={{
        loading,
        hosts,
        groups,
        profiles,
        ports,
        backups,
        onboarded,
        setOnboardedComplete,
        settings,
        updateSettings,
        addHost,
        updateHost,
        deleteHost,
        disableAllHosts,
        addGroup,
        updateGroup,
        deleteGroup,
        addProfile,
        updateProfile,
        deleteProfile,
        duplicateProfile,
        activateProfile,
        addPort,
        updatePort,
        deletePort,
        checkPortLive,
        proxyRules,
        proxyRunningPort,
        caTrusted,
        addProxyRule,
        updateProxyRule,
        deleteProxyRule,
        startProxyServer,
        stopProxyServer,
        checkProxyStatus,
        installRootCa,
        checkCaStatus,
        addBackup,
        deleteBackup,
        restoreBackup,
        notifications,
        addNotification,
        clearNotifications,
        markAllNotificationsAsRead,
        importConfig,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
