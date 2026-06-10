import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
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

  // ─── Initialization ────────────────────────────────────────────────────────

  useEffect(() => {
    async function initStore() {
      try {
        if (isTauri) {
          const config = await invoke<any>("load_app_config");
          // Map backend snake_case to frontend camelCase if needed, or Rust handles it via serde rename_all
          setHosts(config.hosts || []);
          setGroups(config.groups || []);
          setProfiles(config.profiles || []);
          setPorts(config.ports || []);
          setBackups(config.backups || []);
          setOnboarded(config.onboarded || false);
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
          } else {
            // Seed defaults first time
            setHosts(demoHosts);
            setGroups(demoGroups);
            setProfiles(demoProfiles);
            setPorts(demoPorts);
            setBackups(demoBackups);
            setOnboarded(false);
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
      const config = { hosts, groups, profiles, ports, backups, onboarded };
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
  }, [hosts, groups, profiles, ports, backups, onboarded, loading]);

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
        prev.map((p) => (p.id === id ? { ...p, status: isOpen ? "running" : "stopped" } : p))
      );
    } catch (e) {
      console.error("Failed to check port status:", e);
    }
    return isOpen;
  };



  // ── Backups ──
  const addBackup = async (reason: string): Promise<Backup> => {
    if (isTauri) {
      try {
        const record = await invoke<Backup>("backup_hosts_file", { reason });
        setBackups((prev) => [record, ...prev]);
        return record;
      } catch (err) {
        console.error("Backup failed in Tauri:", err);
        throw err;
      }
    } else {
      // Mock backup
      const sizes = ["2.1 KB", "2.2 KB", "2.0 KB", "1.9 KB"];
      const newBackup: Backup = {
        id: uid(),
        createdAt: now(),
        reason,
        size: sizes[Math.floor(Math.random() * sizes.length)],
      };
      setBackups((prev) => [newBackup, ...prev]);
      return newBackup;
    }
  };

  const deleteBackup = (id: string) =>
    setBackups((prev) => prev.filter((b) => b.id !== id));

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
