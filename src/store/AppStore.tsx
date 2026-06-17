import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { translations } from "@/i18n/translations";
import {
  demoHosts,
  demoGroups,
  demoProfiles,
  demoPorts,
  demoBackups,
  type HostEntry,
  type HostGroup,
  type HostProfile,
  type PortRule,
  type Backup,
} from "@/data/demo";

// Helper to detect if running inside Tauri
export const isTauri =
  typeof window !== "undefined" &&
  (window as any).__TAURI_INTERNALS__ !== undefined;

const LOCAL_STORAGE_KEY = "hostpilot_config";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  unread: boolean;
};

export interface ProxyRule {
  id: string;
  domain: string;
  pathPrefix: string;
  targetType: "local" | "external";
  targetAddress: string;
  customResolver?: string;
  enabled: boolean;
  stripPrefix?: boolean;
  isRegex?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type { HostEntry, HostGroup, HostProfile, PortRule, Backup };

export type AppSettings = {
  hostsPath: string;
  previewBeforeApply: boolean;
  backupBeforeWrite: boolean;
  validateBeforeWrite: boolean;
  backupDirectory: string;
  keepBackupsCount: number;
  autoCleanupBackups: boolean;
  showApplyNotifications: boolean;
  showErrorAlerts: boolean;
  portStatusAlerts: boolean;
  colorTheme: "dark" | "light" | "system";
  language: "en" | "th";
  sslEnabled: boolean;
  sslPort: number;
};

export const defaultSettings: AppSettings = {
  hostsPath: "/etc/hosts",
  previewBeforeApply: true,
  backupBeforeWrite: true,
  validateBeforeWrite: true,
  backupDirectory: "",
  keepBackupsCount: 10,
  autoCleanupBackups: true,
  showApplyNotifications: true,
  showErrorAlerts: true,
  portStatusAlerts: false,
  colorTheme: "dark",
  language: "en",
  sslEnabled: false,
  sslPort: 443,
};

type AppStore = {
  // Loading state
  loading: boolean;

  // Data
  hosts: HostEntry[];
  groups: HostGroup[];
  profiles: HostProfile[];
  ports: PortRule[];
  backups: Backup[];
  onboarded: boolean;
  setOnboardedComplete: () => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Hosts CRUD
  addHost: (h: Omit<HostEntry, "id" | "createdAt" | "updatedAt">) => void;
  updateHost: (id: string, patch: Partial<HostEntry>) => void;
  deleteHost: (id: string) => void;
  disableAllHosts: () => void;

  // Groups CRUD
  addGroup: (g: Omit<HostGroup, "id">) => void;
  updateGroup: (id: string, patch: Partial<HostGroup>) => void;
  deleteGroup: (id: string) => void;

  // Profiles CRUD
  addProfile: (p: Omit<HostProfile, "id" | "createdAt" | "updatedAt">) => void;
  updateProfile: (id: string, patch: Partial<HostProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => void;
  activateProfile: (id: string) => void;

  // Ports CRUD
  addPort: (p: Omit<PortRule, "id">) => void;
  updatePort: (id: string, patch: Partial<PortRule>) => void;
  deletePort: (id: string) => void;
  checkPortLive: (id: string, host: string, port: number) => Promise<boolean>;

  // Proxy Rules CRUD & Control
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

  // Backups
  addBackup: (reason: string) => Promise<Backup>;
  deleteBackup: (id: string) => void;
  restoreBackup: (id: string) => Promise<void>;

  // Notifications
  notifications: AppNotification[];
  addNotification: (title: string, description: string, type?: "info" | "success" | "warning" | "error") => void;
  clearNotifications: () => void;
  markAllNotificationsAsRead: () => void;

  // Import / Export
  importConfig: (config: {
    hosts?: any[];
    groups?: any[];
    profiles?: any[];
    ports?: any[];
    proxyRules?: any[];
  }) => {
    hostsImported: number;
    groupsImported: number;
    profilesImported: number;
    portsImported: number;
    proxyRulesImported: number;
  };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 1000;
const uid = () => `id_${++_counter}_${Math.random().toString(36).substr(2, 9)}`;
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
        if (isTauri) {
          const config = await invoke<any>("load_app_config");
          setHosts(config.hosts || []);
          setGroups(config.groups || []);
          setProfiles(config.profiles || []);
          setPorts(config.ports || []);
          setBackups(config.backups || []);
          setOnboarded(config.onboarded || false);
          setNotifications(config.notifications || []);
          setProxyRules(config.proxyRules || []);
          
          try {
            const runningPort = await invoke<number | null>("get_proxy_status");
            setProxyRunningPort(runningPort);
          } catch (e) {
            console.error("Failed to load proxy status on init:", e);
          }

          try {
            const trusted = await invoke<boolean>("check_ca_status");
            setCaTrusted(trusted);
          } catch (e) {
            console.error("Failed to load CA status on init:", e);
          }
          
          let initialSettings = config.settings || defaultSettings;
          try {
            const defaultPath = await invoke<string>("get_default_hosts_path");
            initialSettings = { ...initialSettings, hostsPath: defaultPath };
          } catch (e) {
            console.error("Failed to load default hosts path:", e);
          }
          try {
            const defaultBackupPath = await invoke<string>("get_default_backups_path");
            if (!initialSettings.backupDirectory || initialSettings.backupDirectory === "~/.hostpilot/backups") {
              initialSettings = { ...initialSettings, backupDirectory: defaultBackupPath };
            }
          } catch (e) {
            console.error("Failed to load default backups path:", e);
          }
          if (!config.settings) {
            try {
              const sysLocale = await invoke<string>("get_system_locale");
              if (sysLocale.toLowerCase().startsWith("th")) {
                initialSettings = { ...initialSettings, language: "th" };
              }
            } catch (err) {
              console.error("Failed to detect system locale:", err);
            }
          }
          setSettings(initialSettings);
        } else {
          // Local storage fallback for web development
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) {
            const config = JSON.parse(saved);
            setHosts(config.hosts || []);
            setGroups(config.groups || []);
            setProfiles(config.profiles || []);
            setPorts(config.ports || []);
            setBackups(config.backups || []);
            setOnboarded(config.onboarded || false);
            setSettings(config.settings || defaultSettings);
            setNotifications(config.notifications || []);
            setProxyRules(config.proxyRules || []);
          } else {
            // Seed defaults first time
            setHosts(demoHosts);
            setGroups(demoGroups);
            setProfiles(demoProfiles);
            setPorts(demoPorts);
            setBackups(demoBackups);
            setOnboarded(false);
            let initialSettings = defaultSettings;
            let lang: "en" | "th" = "en";
            if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("th")) {
              initialSettings = { ...defaultSettings, language: "th" };
              lang = "th";
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
        if (isTauri) {
          await invoke("save_app_config", { config });
        } else {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
        }
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

  // Helper to apply theme classes dynamically
  const applyThemeClass = (theme: "dark" | "light" | "system") => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  };

  // Helper to apply language attributes dynamically
  const applyLanguageClass = (lang: "en" | "th") => {
    const root = document.documentElement;
    root.lang = lang;
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
      if (isTauri) {
        isOpen = await invoke<boolean>("check_port", { host, port });
      } else {
        // Fallback random mock check for browser demo
        isOpen = Math.random() > 0.4;
      }
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
      if (isTauri) {
        await invoke("start_proxy_server", {
          port,
          sslEnabled: settings.sslEnabled,
          sslPort: settings.sslPort,
        });
        setProxyRunningPort(port);
      } else {
        setProxyRunningPort(port);
      }
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
      if (isTauri) {
        await invoke("stop_proxy_server");
      }
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
      if (isTauri) {
        const port = await invoke<number | null>("get_proxy_status");
        setProxyRunningPort(port);
      }
    } catch (e) {
      console.error("Failed to check proxy status:", e);
    }
  };

  const checkCaStatus = async () => {
    try {
      if (isTauri) {
        const trusted = await invoke<boolean>("check_ca_status");
        setCaTrusted(trusted);
      }
    } catch (e) {
      console.error("Failed to check CA status:", e);
    }
  };

  const installRootCa = async () => {
    try {
      if (isTauri) {
        await invoke("install_root_ca");
        setCaTrusted(true);
        addNotification(
          t("notif.caInstalledTitle"),
          t("notif.caInstalledDesc"),
          "success"
        );
      } else {
        setCaTrusted(true);
        addNotification(
          "Local Root CA Installed (Mock)",
          "Root CA has been added to user trust store.",
          "success"
        );
      }
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
    if (isTauri) {
      try {
        record = await invoke<Backup>("backup_hosts_file", { reason });
      } catch (err) {
        console.error("Backup failed in Tauri:", err);
        throw err;
      }
    } else {
      // Mock backup
      const sizes = ["2.1 KB", "2.2 KB", "2.0 KB", "1.9 KB"];
      record = {
        id: uid(),
        createdAt: now(),
        reason,
        size: sizes[Math.floor(Math.random() * sizes.length)],
      };
    }

    setBackups((prev) => {
      let next = [record, ...prev];
      if (settings.autoCleanupBackups && settings.keepBackupsCount > 0) {
        if (next.length > settings.keepBackupsCount) {
          const itemsToPrune = next.slice(settings.keepBackupsCount);
          if (isTauri) {
            for (const item of itemsToPrune) {
              invoke("delete_backup_file", { backupId: item.id }).catch((e) =>
                console.error("Failed to delete pruned backup file:", e)
              );
            }
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
    if (isTauri) {
      try {
        await invoke("delete_backup_file", { backupId: id });
      } catch (err) {
        console.error("Failed to delete backup file physically:", err);
      }
    }
    setBackups((prev) => prev.filter((b) => b.id !== id));
  };

  const restoreBackup = async (id: string): Promise<void> => {
    const reason = backups.find((b) => b.id === id)?.reason || "Unknown";
    if (isTauri) {
      await invoke("restore_backup", { backupId: id });
    }
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
    const groupsData = configData.groups || [];
    const hostsData = configData.hosts || [];
    const profilesData = configData.profiles || [];
    const portsData = configData.ports || [];
    const proxyRulesData = configData.proxyRules || [];

    let groupsImported = 0;
    let hostsImported = 0;
    let profilesImported = 0;
    let portsImported = 0;
    let proxyRulesImported = 0;

    const groupOldToNewId: Record<string, string> = {};
    const hostOldToNewId: Record<string, string> = {};

    // 1. Merge Groups
    let nextGroups = [...groups];
    groupsData.forEach((g) => {
      if (!g.name) return;
      const existing = nextGroups.find((eg) => eg.name.toLowerCase() === g.name.toLowerCase());
      if (existing) {
        groupOldToNewId[g.id || g.name] = existing.id;
      } else {
        const newId = uid();
        nextGroups.push({
          id: newId,
          name: g.name,
          color: g.color || "gray",
          description: g.description || null,
        });
        groupOldToNewId[g.id || g.name] = newId;
        groupsImported++;
      }
    });

    // 2. Merge Hosts
    let nextHosts = [...hosts];
    hostsData.forEach((h) => {
      const domain = h.domain || h.name;
      if (!domain || !h.ip) return;
      const existing = nextHosts.find((eh) => eh.domain.toLowerCase() === domain.toLowerCase());
      if (existing) {
        hostOldToNewId[h.id || h.name] = existing.id;
      } else {
        const newId = uid();
        const oldGroupId = h.groupId || h.group_id;
        let newGroupId: string | undefined = undefined;

        if (oldGroupId) {
          if (groupOldToNewId[oldGroupId]) {
            newGroupId = groupOldToNewId[oldGroupId];
          } else {
            // Direct ID match
            const directMatch = nextGroups.find((eg) => eg.id === oldGroupId);
            if (directMatch) {
              newGroupId = directMatch.id;
            }
          }
        }

        if (!newGroupId && h.group) {
          // Look up by group name
          const matchedGroup = nextGroups.find(
            (eg) => eg.name.toLowerCase() === h.group.toLowerCase()
          );
          if (matchedGroup) {
            newGroupId = matchedGroup.id;
          }
        }

        nextHosts.push({
          id: newId,
          domain,
          ip: h.ip,
          enabled: h.enabled !== false,
          groupId: newGroupId,
          description: h.description || t("notif.importedJsonDesc"),
          source: "imported",
          createdAt: h.createdAt || now(),
          updatedAt: now(),
        });
        hostOldToNewId[h.id || h.name] = newId;
        hostsImported++;
      }
    });

    // 3. Merge Profiles
    let nextProfiles = [...profiles];
    profilesData.forEach((p) => {
      if (!p.name) return;
      const existing = nextProfiles.find((ep) => ep.name.toLowerCase() === p.name.toLowerCase());
      const entryIds = p.entryIds || p.entry_ids || [];
      const importedMappedIds = entryIds
        .map((oldId: string) => {
          if (hostOldToNewId[oldId]) {
            return hostOldToNewId[oldId];
          }
          // Direct ID match
          const directMatch = nextHosts.find((eh) => eh.id === oldId);
          if (directMatch) {
            return directMatch.id;
          }
          // Lookup by domain/name match
          const nameMatch = nextHosts.find((eh) => eh.domain.toLowerCase() === oldId.toLowerCase());
          if (nameMatch) {
            return nameMatch.id;
          }
          return null;
        })
        .filter(Boolean) as string[];

      if (existing) {
        const combinedIds = Array.from(new Set([...existing.entryIds, ...importedMappedIds]));
        nextProfiles = nextProfiles.map((ep) =>
          ep.id === existing.id ? { ...existing, entryIds: combinedIds, updatedAt: now() } : ep
        );
      } else {
        const newId = uid();
        nextProfiles.push({
          id: newId,
          name: p.name,
          description: p.description || null,
          entryIds: importedMappedIds,
          active: false,
          favorite: p.favorite === true,
          createdAt: p.createdAt || now(),
          updatedAt: now(),
        });
        profilesImported++;
      }
    });

    // 4. Merge Ports
    let nextPorts = [...ports];
    portsData.forEach((p) => {
      if (!p.domain || !p.port) return;
      const existing = nextPorts.find(
        (ep) => ep.domain.toLowerCase() === p.domain.toLowerCase() && ep.port === Number(p.port)
      );
      if (!existing) {
        nextPorts.push({
          id: uid(),
          domain: p.domain,
          targetHost: p.targetHost || p.target_host || "127.0.0.1",
          port: Number(p.port),
          protocol: p.protocol === "https" ? "https" : "http",
          enabled: p.enabled !== false,
          status: p.status === "running" || p.status === "stopped" || p.status === "unknown" ? p.status : "stopped",
        });
        portsImported++;
      }
    });

    // 5. Merge Proxy Rules
    let nextProxyRules = [...proxyRules];
    proxyRulesData.forEach((r) => {
      if (!r.domain || !r.pathPrefix) return;
      const existing = nextProxyRules.find(
        (er) => er.domain.toLowerCase() === r.domain.toLowerCase() && er.pathPrefix.toLowerCase() === r.pathPrefix.toLowerCase()
      );
      if (!existing) {
        nextProxyRules.push({
          id: uid(),
          domain: r.domain,
          pathPrefix: r.pathPrefix,
          targetType: r.targetType || "local",
          targetAddress: r.targetAddress,
          customResolver: r.customResolver,
          enabled: r.enabled !== false,
          createdAt: r.createdAt || now(),
          updatedAt: now(),
        });
        proxyRulesImported++;
      }
    });

    // Apply updates synchronously if any changes occurred
    if (groupsImported > 0) setGroups(nextGroups);
    if (hostsImported > 0) setHosts(nextHosts);
    if (profilesImported > 0) setProfiles(nextProfiles);
    if (portsImported > 0) setPorts(nextPorts);
    if (proxyRulesImported > 0) setProxyRules(nextProxyRules);

    addNotification(
      "Configuration Mapped & Imported",
      `Mapped and merged config: ${hostsImported} hosts, ${groupsImported} groups, ${profilesImported} profiles, ${portsImported} port rules, ${proxyRulesImported} proxy rules.`,
      "success"
    );

    return {
      hostsImported,
      groupsImported,
      profilesImported,
      portsImported,
      proxyRulesImported,
    };
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
