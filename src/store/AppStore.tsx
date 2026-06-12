import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
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
  compactMode: boolean;
  language: "en" | "th";
};

export const defaultSettings: AppSettings = {
  hostsPath: "/etc/hosts",
  previewBeforeApply: true,
  backupBeforeWrite: true,
  validateBeforeWrite: true,
  backupDirectory: "~/.hostpilot/backups",
  keepBackupsCount: 10,
  autoCleanupBackups: true,
  showApplyNotifications: true,
  showErrorAlerts: true,
  portStatusAlerts: false,
  colorTheme: "dark",
  compactMode: false,
  language: "en",
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

  // Backups
  addBackup: (reason: string) => Promise<Backup>;
  deleteBackup: (id: string) => void;
  restoreBackup: (id: string) => Promise<void>;
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
          
          let initialSettings = config.settings || defaultSettings;
          try {
            const defaultPath = await invoke<string>("get_default_hosts_path");
            initialSettings = { ...initialSettings, hostsPath: defaultPath };
          } catch (e) {
            console.error("Failed to load default hosts path:", e);
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
          } else {
            // Seed defaults first time
            setHosts(demoHosts);
            setGroups(demoGroups);
            setProfiles(demoProfiles);
            setPorts(demoPorts);
            setBackups(demoBackups);
            setOnboarded(false);

            let initialSettings = defaultSettings;
            if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("th")) {
              initialSettings = { ...defaultSettings, language: "th" };
            }
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
      const config = { hosts, groups, profiles, ports, backups, onboarded, settings };
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
  }, [hosts, groups, profiles, ports, backups, onboarded, loading, settings]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.colorTheme !== undefined) {
        applyThemeClass(patch.colorTheme);
      }
      if (patch.compactMode !== undefined) {
        applyCompactClass(patch.compactMode);
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

  // Helper to apply compact mode class dynamically
  const applyCompactClass = (compact: boolean) => {
    const root = document.documentElement;
    if (compact) {
      root.classList.add("compact");
    } else {
      root.classList.remove("compact");
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
      applyCompactClass(settings.compactMode);
      applyLanguageClass(settings.language);
    }
  }, [settings.colorTheme, settings.compactMode, settings.language, loading]);

  // ── Hosts ──
  const addHost = (h: Omit<HostEntry, "id" | "createdAt" | "updatedAt">) =>
    setHosts((prev) => [
      ...prev,
      { ...h, id: uid(), createdAt: now(), updatedAt: now() },
    ]);

  const updateHost = (id: string, patch: Partial<HostEntry>) =>
    setHosts((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: now() } : h))
    );

  const deleteHost = (id: string) => {
    setHosts((prev) => prev.filter((h) => h.id !== id));
    // Remove from profiles too
    setProfiles((prev) =>
      prev.map((p) => ({ ...p, entryIds: p.entryIds.filter((e) => e !== id) }))
    );
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

  const activateProfile = (id: string) =>
    setProfiles((prev) =>
      prev.map((p) => ({ ...p, active: p.id === id, updatedAt: now() }))
    );

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
            if (settings.portStatusAlerts && oldStatus === "running" && newStatus === "stopped") {
              toast.error(`Port Down: ${p.domain}:${p.port}`, {
                description: `Connection to target host ${p.targetHost} has failed.`,
              });
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
    if (isTauri) {
      await invoke("restore_backup", { backupId: id });
    }
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
        addBackup,
        deleteBackup,
        restoreBackup,
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
