// Demo data for hostpilot UI prototype

export type HostEntry = {
  id: string;
  domain: string;
  ip: string;
  enabled: boolean;
  groupId?: string;
  description?: string;
  source: "manual" | "imported" | "project-file";
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

export const demoGroups: HostGroup[] = [
  { id: "g1", name: "Frontend", description: "UI and web app services", color: "#6366f1" },
  { id: "g2", name: "Backend", description: "API and backend services", color: "#10b981" },
  { id: "g3", name: "Admin", description: "Admin panel and dashboards", color: "#f59e0b" },
  { id: "g4", name: "Staging", description: "Staging environment mirrors", color: "#8b5cf6" },
  { id: "g5", name: "Operator A", description: "Operator A tenant domains", color: "#ec4899" },
];

export const demoHosts: HostEntry[] = [
  { id: "h1", domain: "web.local", ip: "127.0.0.1", enabled: true, groupId: "g1", description: "Main web app", source: "project-file", createdAt: "2026-06-01T08:00:00Z", updatedAt: "2026-06-08T12:00:00Z" },
  { id: "h2", domain: "api.local", ip: "127.0.0.1", enabled: true, groupId: "g2", description: "REST API service", source: "project-file", createdAt: "2026-06-01T08:00:00Z", updatedAt: "2026-06-08T12:00:00Z" },
  { id: "h3", domain: "admin.local", ip: "127.0.0.1", enabled: true, groupId: "g3", description: "Admin dashboard", source: "manual", createdAt: "2026-06-02T10:00:00Z", updatedAt: "2026-06-08T12:00:00Z" },
  { id: "h4", domain: "staging.web.local", ip: "127.0.0.1", enabled: false, groupId: "g4", description: "Staging frontend", source: "imported", createdAt: "2026-06-03T10:00:00Z", updatedAt: "2026-06-08T12:00:00Z" },
  { id: "h5", domain: "staging.api.local", ip: "127.0.0.1", enabled: false, groupId: "g4", description: "Staging API", source: "imported", createdAt: "2026-06-03T10:00:00Z", updatedAt: "2026-06-08T12:00:00Z" },
  { id: "h6", domain: "op-a.web.local", ip: "127.0.0.1", enabled: true, groupId: "g5", description: "Operator A portal", source: "manual", createdAt: "2026-06-04T09:00:00Z", updatedAt: "2026-06-08T12:00:00Z" },
  { id: "h7", domain: "op-a.api.local", ip: "127.0.0.1", enabled: true, groupId: "g5", description: "Operator A API", source: "manual", createdAt: "2026-06-04T09:00:00Z", updatedAt: "2026-06-08T12:00:00Z" },
  { id: "h8", domain: "auth.local", ip: "127.0.0.1", enabled: true, groupId: "g2", description: "Auth service", source: "project-file", createdAt: "2026-06-05T11:00:00Z", updatedAt: "2026-06-08T12:00:00Z" },
];

export const demoProfiles: HostProfile[] = [
  { id: "p1", name: "Local Dev", description: "Standard local development environment", entryIds: ["h1","h2","h3","h8"], active: true, favorite: true, createdAt: "2026-06-01T08:00:00Z", updatedAt: "2026-06-08T12:00:00Z" },
  { id: "p2", name: "Full Stack", description: "All services including admin and auth", entryIds: ["h1","h2","h3","h8","h6","h7"], active: false, favorite: true, createdAt: "2026-06-02T08:00:00Z", updatedAt: "2026-06-07T10:00:00Z" },
  { id: "p3", name: "Staging Mirror", description: "Staging environment simulation", entryIds: ["h4","h5"], active: false, favorite: false, createdAt: "2026-06-03T08:00:00Z", updatedAt: "2026-06-06T09:00:00Z" },
  { id: "p4", name: "Operator A", description: "Operator A tenant environment", entryIds: ["h1","h6","h7"], active: false, favorite: false, createdAt: "2026-06-05T08:00:00Z", updatedAt: "2026-06-05T08:00:00Z" },
];

export const demoPorts: PortRule[] = [
  { id: "pr1", domain: "web.local", targetHost: "127.0.0.1", port: 3000, protocol: "http", enabled: true, status: "running" },
  { id: "pr2", domain: "api.local", targetHost: "127.0.0.1", port: 8080, protocol: "http", enabled: true, status: "running" },
  { id: "pr3", domain: "admin.local", targetHost: "127.0.0.1", port: 5173, protocol: "http", enabled: true, status: "stopped" },
  { id: "pr4", domain: "auth.local", targetHost: "127.0.0.1", port: 4000, protocol: "http", enabled: true, status: "running" },
  { id: "pr5", domain: "op-a.web.local", targetHost: "127.0.0.1", port: 3001, protocol: "http", enabled: true, status: "unknown" },
  { id: "pr6", domain: "staging.web.local", targetHost: "127.0.0.1", port: 3100, protocol: "http", enabled: false, status: "stopped" },
];

export const demoProjects: Project[] = [
  { id: "proj1", name: "demo-local", path: "~/projects/demo-local/.hostpilot", active: true, lastActivatedAt: "2026-06-10T08:00:00Z", entryCount: 4 },
  { id: "proj2", name: "saas-platform", path: "~/projects/saas-platform/.hostpilot", active: false, lastActivatedAt: "2026-06-08T15:00:00Z", entryCount: 6 },
  { id: "proj3", name: "operator-portal", path: "~/projects/operator-portal/.hostpilot", active: false, lastActivatedAt: "2026-06-06T09:00:00Z", entryCount: 3 },
];

export const demoBackups: Backup[] = [
  { id: "b1", createdAt: "2026-06-10T08:15:00Z", reason: "Before applying Local Dev profile", size: "2.1 KB" },
  { id: "b2", createdAt: "2026-06-09T14:32:00Z", reason: "Before applying Full Stack profile", size: "2.0 KB" },
  { id: "b3", createdAt: "2026-06-08T10:05:00Z", reason: "Manual backup", size: "1.9 KB" },
  { id: "b4", createdAt: "2026-06-07T09:20:00Z", reason: "Before import from saas-platform", size: "1.8 KB" },
  { id: "b5", createdAt: "2026-06-06T16:45:00Z", reason: "Before applying Staging Mirror profile", size: "1.8 KB" },
];
