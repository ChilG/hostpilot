import { createContext, useContext, useState, type ReactNode } from "react";
import {
  demoHosts,
  demoGroups,
  demoProfiles,
  demoPorts,
  demoProjects,
  demoBackups,
  type HostEntry,
  type HostGroup,
  type HostProfile,
  type PortRule,
  type Project,
  type Backup,
} from "@/data/demo";

// ─── Types ──────────────────────────────────────────────────────────────────

export type { HostEntry, HostGroup, HostProfile, PortRule, Project, Backup };

type AppStore = {
  // Data
  hosts: HostEntry[];
  groups: HostGroup[];
  profiles: HostProfile[];
  ports: PortRule[];
  projects: Project[];
  backups: Backup[];

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

  // Projects CRUD
  addProject: (p: Omit<Project, "id" | "lastActivatedAt">) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  activateProject: (id: string) => void;

  // Backups
  addBackup: (reason: string) => void;
  deleteBackup: (id: string) => void;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

let _counter = 1000;
const uid = () => `demo_${++_counter}`;
const now = () => new Date().toISOString();

// ─── Context ────────────────────────────────────────────────────────────────

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [hosts, setHosts] = useState<HostEntry[]>(demoHosts);
  const [groups, setGroups] = useState<HostGroup[]>(demoGroups);
  const [profiles, setProfiles] = useState<HostProfile[]>(demoProfiles);
  const [ports, setPorts] = useState<PortRule[]>(demoPorts);
  const [projects, setProjects] = useState<Project[]>(demoProjects);
  const [backups, setBackups] = useState<Backup[]>(demoBackups);

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

  // ── Projects ──
  const addProject = (p: Omit<Project, "id" | "lastActivatedAt">) =>
    setProjects((prev) => [
      ...prev,
      { ...p, id: uid(), lastActivatedAt: now() },
    ]);

  const updateProject = (id: string, patch: Partial<Project>) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );

  const deleteProject = (id: string) =>
    setProjects((prev) => prev.filter((p) => p.id !== id));

  const activateProject = (id: string) =>
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        active: p.id === id,
        lastActivatedAt: p.id === id ? now() : p.lastActivatedAt,
      }))
    );

  // ── Backups ──
  const addBackup = (reason: string) => {
    const sizes = ["2.1 KB", "2.2 KB", "2.0 KB", "1.9 KB"];
    setBackups((prev) => [
      {
        id: uid(),
        createdAt: now(),
        reason,
        size: sizes[Math.floor(Math.random() * sizes.length)],
      },
      ...prev,
    ]);
  };

  const deleteBackup = (id: string) =>
    setBackups((prev) => prev.filter((b) => b.id !== id));

  return (
    <AppStoreContext.Provider
      value={{
        hosts,
        groups,
        profiles,
        ports,
        projects,
        backups,
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
        addProject,
        updateProject,
        deleteProject,
        activateProject,
        addBackup,
        deleteBackup,
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
