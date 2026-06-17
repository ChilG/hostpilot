// Initial data/types for hostpilot

export type HostEntry = {
  id: string;
  domain: string;
  ip: string;
  enabled: boolean;
  groupId?: string;
  description?: string;
  source: "manual" | "imported";
  createdAt: string;
  updatedAt: string;
};

export type HostGroup = {
  id: string;
  name: string;
  description?: string;
  color: string;
};

export type HostProfile = {
  id: string;
  name: string;
  description?: string;
  entryIds: string[];
  active: boolean;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PortRule = {
  id: string;
  domain: string;
  targetHost: string;
  port: number;
  protocol: "http" | "https";
  enabled: boolean;
  status: "running" | "stopped" | "unknown";
};

export type Project = {
  id: string;
  name: string;
  path: string;
  active: boolean;
  lastActivatedAt: string;
  entryCount: number;
};

export type Backup = {
  id: string;
  createdAt: string;
  reason: string;
  size: string;
};

export const initialGroups: HostGroup[] = [];
export const initialHosts: HostEntry[] = [];
export const initialProfiles: HostProfile[] = [];
export const initialPorts: PortRule[] = [];
export const initialProjects: Project[] = [];
export const initialBackups: Backup[] = [];
