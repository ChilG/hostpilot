// Helper to detect if running inside Tauri
export const isTauri =
  typeof window !== "undefined" &&
  (window as any).__TAURI_INTERNALS__ !== undefined;

// ─── Data Models ────────────────────────────────────────────────────────────

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
  isDynamic?: boolean;
  dynamicType?: "url" | "script";
  dynamicValue?: string;
  lastSynced?: string;
  syncInterval?: number;
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

// ─── Initial Empty States ───────────────────────────────────────────────────

export const initialGroups: HostGroup[] = [];
export const initialHosts: HostEntry[] = [];
export const initialProfiles: HostProfile[] = [];
export const initialPorts: PortRule[] = [];
export const initialProjects: Project[] = [];
export const initialBackups: Backup[] = [];

// ─── App Store Types ─────────────────────────────────────────────────────────

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

export type AppStore = {
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
  enableAllHosts: () => void;
  toggleGroupHosts: (groupId: string, enabled: boolean) => void;

  // Groups CRUD
  addGroup: (g: Omit<HostGroup, "id">) => void;
  updateGroup: (id: string, patch: Partial<HostGroup>) => void;
  deleteGroup: (id: string, deleteAssociatedHosts?: boolean) => void;

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
