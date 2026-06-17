# HostPilot — Project Planning, Specifications & Implementation Checklist

This document merges and updates the information previously split across `PLANNING.md`, `CHECKLIST.md`, and `SPEC.md`. It serves as the single source of truth for the product specification, technical architecture, and development progress of **hostpilot**.

---

## 📋 Table of Contents

1. [Product Overview & Main Goal](#1-product-overview--main-goal)
2. [Problem Statement & Target Users](#2-problem-statement--target-users)
3. [Main Use Cases](#3-main-use-cases)
4. [Architecture & Data Model](#4-architecture--data-model)
   - 4.1 [Technical Constraints](#41-technical-constraints)
   - 4.2 [Tech Stack](#42-tech-stack)
   - 4.3 [Data Model (TypeScript Types)](#43-data-model-typescript-types)
   - 4.4 [State Management Decisions](#44-state-management-decisions)
5. [Hosts File Management Strategy](#5-hosts-file-management-strategy)
   - 5.1 [Managed Block Format](#51-managed-block-format)
   - 5.2 [Write Rules & Pseudocode](#52-write-rules--pseudocode)
6. [Security & Privilege Elevation Plan](#6-security--privilege-elevation-plan)
   - 6.1 [Platform Elevation Strategy](#61-platform-elevation-strategy)
   - 6.2 [Security Risk Checklist](#62-security-risk-checklist)
7. [Configuration File Schemas](#7-configuration-file-schemas)
   - 7.1 [`hostpilot.config.json`](#71-hostpilotconfigjson)
   - 7.2 [Zod Schema for Config Import](#72-zod-schema-for-config-import)
   - 7.3 [Import & Export Behaviors](#73-import--export-behaviors)
8. [UI Page Structure & Components](#8-ui-page-structure--components)
   - 8.1 [Page Breakdown](#81-page-breakdown)
   - 8.2 [shadcn/ui Component Mapping](#82-shadcnui-component-mapping)
9. [Tauri Rust/Frontend API Commands](#9-tauri-rustfrontend-api-commands)
10. [CLI Tool Proposal (Future Scope)](#10-cli-tool-proposal-future-scope)
11. [Roadmap & Release Strategy](#11-roadmap--release-strategy)
    - 11.1 [Version Milestones](#111-version-milestones)
    - 11.2 [Risks & Mitigations](#112-risks--mitigations)
12. [Project File Structure](#12-project-file-structure)
13. [Implementation Checklist](#13-implementation-checklist)
    - 13.1 [Core Features Checklist](#131-core-features-checklist)
    - 13.2 [Rust/Tauri Background Communication Checklist](#132-rusttauri-background-communication-checklist)
14. [Design Adjustments & Historical Decisions](#14-design-adjustments--historical-decisions)
15. [Suggested README Draft](#15-suggested-readme-draft)

---

## 1. Product Overview & Main Goal

**hostpilot** is a cross-platform desktop application (macOS, Linux, Windows) that gives developers a safe, visual interface for managing their system hosts file (e.g. `/etc/hosts` on macOS/Linux or `%SystemRoot%\System32\drivers\etc\hosts` on Windows).

### Naming & Path Conventions
* **App Name**: hostpilot
* **CLI Name**: hostpilot
* **Config Folder**: `.hostpilot`
* **Config File**: `hostpilot.config.json`
* **Managed Block Name**: `HostPilot`

### Main Goal
The primary objective of hostpilot is to help developers run production-like local environments by:
- Managing local domain mappings.
- Organizing domains by category or group.
- Creating and activating environment profiles.
- Storing recently used profiles.
- Importing and exporting configuration files.
- Tracking port mappings for local web services (metadata MVP).
- Safely updating the system hosts file by targeting managed blocks without editing user-managed entries.
- Backing up the system hosts file before every write.
- Previewing changes before applying them.

---

## 2. Problem Statement & Target Users

### Problem Statement

| Pain Point | Detail |
| :--- | :--- |
| **Manual hosts editing** | `sudo nano /etc/hosts` is error-prone, lacks history, and has no safety preview. |
| **No grouping or labeling** | Developers accumulate dozens of unlabeled entries over time. |
| **Environment switching** | Switching between staging, local, and production configurations requires tedious manual edits. |
| **Team onboarding** | New developers copy-paste entries from Slack or Notion documentation with no syntax validation. |
| **Port confusion** | Knowing which domain maps to which local port resides entirely in developer memory. |
| **Accidental overwrites** | A single bad save can break all local system network operations. |

### Target Users

* **Solo Developer**: Manages multiple local projects, each with custom domains.
* **Full-Stack Developer**: Runs frontend, backend, and admin interfaces on separate `.local` domains.
* **DevOps / Platform Engineer**: Sets up production-simulation environments locally.
* **Team Lead**: Distributes standardized project environment configurations to team members.

---

## 3. Main Use Cases

1. **Quick Add**: Add `web.local → 127.0.0.1` and activate it with a single click.
2. **Profile Switching**: Switch between "Staging Simulation" and "Local Dev" environment profiles instantly.
3. **Diff Preview**: Preview the exact unified diff before writing changes to the system hosts file.
4. **Recovery**: Restore a backup snapshot if a write fails or breaks local services.
5. **Port Mapping Reference**: Review which port each domain maps to (port metadata catalog).

---

## 4. Architecture & Data Model

### 4.1 Technical Constraints
The system hosts file maps IP addresses to hostnames only. 
* **Valid**: `127.0.0.1 web.local`
* **Invalid**: `127.0.0.1:3000 web.local`

Thus, port management is treated strictly as **metadata** in the current version. (Future versions may support built-in reverse proxying).

### 4.2 Tech Stack
- **Tauri Framework** (v2 Rust backend engine)
- **React + TypeScript** (Frontend framework)
- **Tailwind CSS + shadcn/ui** (Premium styling and component framework)
- **JSON App Configuration** (Stored in the platform App Data directory)
- **Zod** (Schema validation)

### 4.3 Data Model (TypeScript Types)

```ts
type HostEntry = {
  id: string;                         // Unique ID (e.g. nanoid)
  domain: string;                     // e.g., "web.local"
  ip: string;                         // e.g., "127.0.0.1" (IPv4 or IPv6)
  enabled: boolean;
  groupId?: string;
  description?: string;
  source: "manual" | "imported";
  createdAt: string;                  // ISO 8601
  updatedAt: string;
};

type HostGroup = {
  id: string;
  name: string;
  description?: string;
  color?: string;                     // Hex color preset
};

type HostProfile = {
  id: string;
  name: string;
  description?: string;
  entryIds: string[];
  portRuleIds?: string[];
  isFavorite: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PortRule = {
  id: string;
  domain: string;
  targetHost: string;                 // e.g., "127.0.0.1"
  port: number;                       // 1–65535
  protocol: "http" | "https";
  enabled: boolean;
};

type RecentProfile = {
  profileId: string;
  activatedAt: string;
};

type BackupRecord = {
  id: string;
  filePath: string;                   // Absolute path to the backup file
  createdAt: string;
  reason: string;                     // e.g., "apply-profile", "import", "manual"
};

type AppConfig = {
  version: string;
  entries: HostEntry[];
  groups: HostGroup[];
  profiles: HostProfile[];
  portRules: PortRule[];
  recentProfiles: RecentProfile[];
  backups: BackupRecord[];
  settings: AppSettings;
};

type AppSettings = {
  hostsPath: string;
  backupDirectory: string;
  keepBackupsCount: number;
  autoCleanupBackups: boolean;
  previewBeforeApply: boolean;
  backupBeforeWrite: boolean;
  validateBeforeWrite: boolean;
  showApplyNotifications: boolean;
  showErrorAlerts: boolean;
  portStatusAlerts: boolean;
  colorTheme: "light" | "dark" | "system";
  language: "en" | "th";
};
```

### 4.4 State Management Decisions
Instead of using Zustand as originally drafted, HostPilot employs a consolidated React context state store [AppStore.tsx](file:///Users/chilgoe/Documents/2026/hostpilot/src/store/AppStore.tsx) linked to [apiAdapter.ts](file:///Users/chilgoe/Documents/2026/hostpilot/src/store/apiAdapter.ts). This handles load/save config cycles, synchronizes with the Tauri background tasks, manages preferences, and propagates theme/language toggles directly to the application shell.

---

## 5. Hosts File Management Strategy

### 5.1 Managed Block Format
To prevent overwriting the system hosts file, hostpilot reads the existing file, isolates its managed blocks, and updates them by block name.

```txt
# >>> HostPilot START: demo-local
127.0.0.1  web.local
127.0.0.1  api.local
# <<< HostPilot END: demo-local
```

### 5.2 Write Rules & Pseudocode
- **Non-destructive**: Lines outside the HostPilot tags are kept untouched.
- **Multiple blocks**: Active profiles get distinct managed tags.
- **Idempotency**: Writing the same block twice updates it without appending duplicates.
- **Disabled omission**: Host entries marked `enabled: false` are skipped when translating configurations to system hosts file updates.

#### Write Algorithm
```
1. Read the current system hosts file.
2. Separate user-defined lines from managed HostPilot blocks.
3. Build the new block contents representing the active profile entries.
4. Replace the old block of the same name (or append it at the end if it doesn't exist).
5. Generate a unified diff comparison between the current hosts contents and the proposed updates.
6. Display the diff preview to the user.
7. Upon approval, backup the hosts file to the configuration's backup directory.
8. Write the new string contents to the system hosts file using privilege elevation.
9. Append a BackupRecord entry to the AppConfig database.
```

---

## 6. Security & Privilege Elevation Plan

### 6.1 Platform Elevation Strategy
Writing to hosts files requires root/admin privilege.
* **macOS**: Prompts users for passwords or Touch ID using `osascript` administrator prompts.
* **Linux**: Escapes privileges using `pkexec` (PolicyKit) with graphical auth prompts.
* **Windows**: Runs PowerShell elevated commands with administrative UAC prompts.

> [!IMPORTANT]
> To prevent shell injection exploits, the app writes contents to a temporary file in user-accessible directory paths, then executes a copy command (`cp` or `copy`) using the elevated binary, passing file parameters rather than interpolating raw contents into shell commands.

### 6.2 Security Risk Checklist

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Shell Injection** | Critical | Avoid string interpolation of entries into shell commands; perform file-copy transitions. |
| **Total Overwrite** | Critical | Always isolate write regions via managed blocks; write auto-backups before committing writes. |
| **Invalid hosts entry format** | Medium | Filter and reject malformed IP addresses and domains using frontend schemas (Zod). |
| **Backup Corruption** | High | Run verify-checks on post-write sizes; keep a user-defined max backup limit (e.g. 20) with automated rotation. |

---

## 7. Configuration File Schemas

### 7.1 `hostpilot.config.json`
Comprehensive configuration serialization schema:

```json
{
  "version": "1.0.0",
  "project": "demo-local",
  "name": "Demo Local ENV",
  "entries": [
    {
      "domain": "web.local",
      "ip": "127.0.0.1",
      "enabled": true,
      "group": "frontend"
    }
  ],
  "ports": [
    {
      "domain": "web.local",
      "targetHost": "127.0.0.1",
      "port": 3000,
      "protocol": "http"
    }
  ]
}
```

### 7.2 Zod Schema for Config Import

```ts
import { z } from "zod";

const HostEntryImportSchema = z.object({
  domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i),
  ip: z.string().ip(),
  enabled: z.boolean().default(true),
  group: z.string().optional(),
});

const PortRuleImportSchema = z.object({
  domain: z.string(),
  targetHost: z.string().ip(),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(["http", "https"]),
});

const HostpilotConfigSchema = z.object({
  version: z.string(),
  project: z.string(),
  name: z.string(),
  entries: z.array(HostEntryImportSchema),
  ports: z.array(PortRuleImportSchema).optional(),
});
```

### 7.3 Import & Export Behaviors
To streamline configuration sharing:
- **Config Import/Export**: The Import/Export page exclusively accepts `hostpilot.config.json` to import or merge profiles, groups, and ports.

---

## 8. UI Page Structure & Components

### 8.1 Page Breakdown
* **Dashboard**: Displays active status, active profile, and stats (e.g., active backups, port checks, recent entries).
* **Hosts Page**: Table listing domains, groups, and sources. Features toggle switches and an add/edit sheet.
* **Groups Page**: Categories grid with color themes.
* **Profiles Page**: List of custom profile configurations. Features activation hooks.
* **Ports Page**: Review port check statuses (TCP connect tests) and trigger native browser links.
* **Import/Export Page**: Full JSON config backup operations (`hostpilot.config.json`).
* **Backups Page**: Review snapshot directories and execute one-click rollbacks.
* **Settings Page**: Modify hosts path, toggle theme, select backup folders, and change system languages.

### 8.2 shadcn/ui Component Mapping

| UI Element | shadcn/ui Component |
| :--- | :--- |
| **Buttons** | `Button` |
| **Tables** | `Table` |
| **Forms** | `Input`, `Label`, `Select`, `Textarea` |
| **Toggles** | `Switch` |
| **Flyouts** | `Sheet` |
| **Confirmation Modals** | `Dialog` / `AlertDialog` |
| **Unified Diff Previews** | `Dialog` + `ScrollArea` |
| **Badges & Lists** | `Badge` |
| **Color Pickers** | `Popover` + custom layout grid |
| **Notifications** | `Sonner` |

---

## 9. Tauri Rust/Frontend API Commands

```ts
// Hosts operations
invoke("read_hosts_file") → Promise<string>
invoke("write_hosts_block", { blockName: string, entries: HostEntry[] }) → Promise<void>
invoke("remove_hosts_block", { blockName: string }) → Promise<void>
invoke("get_hosts_diff", { blockName: string, entries: HostEntry[] }) → Promise<string>
invoke("backup_hosts_file") → Promise<BackupRecord>
invoke("restore_backup", { backupId: string }) → Promise<void>
invoke("list_backups") → Promise<BackupRecord[]>

// Config commands
load_app_config() → Promise<AppConfig>
save_app_config({ config: AppConfig }) → Promise<void>

// Settings & Utilities
invoke("get_default_hosts_path") → Promise<string>
invoke("select_backup_directory") → Promise<string | null>
invoke("get_system_locale") → Promise<string>
invoke("check_port", { host: string, port: number }) → Promise<boolean>
invoke("open_in_browser", { url: string }) → Promise<void>
invoke("reveal_in_finder", { path: string }) → Promise<void>
```

---

## 10. CLI Tool Proposal (Future Scope)

Not included in the v1 MVP. Proposed v2 command structure:

```bash
hostpilot init                            # Create .hostpilot/ in current dir
hostpilot apply [profile-name]            # Apply a profile to /etc/hosts
hostpilot diff [profile-name]             # Show diff without applying
hostpilot remove [profile-name]           # Remove a managed block
hostpilot restore                         # Restore most recent backup
hostpilot list                            # List all profiles
hostpilot open [domain]                   # Open domain in browser
hostpilot status                          # Show current managed blocks
```

---

## 11. Roadmap & Release Strategy

### 11.1 Version Milestones
1. **v1 (Personal MVP)**: Desktop GUI with Tauri, profile switching, safe block writes, backups, local JSON settings, and localization support.
2. **v2 (Developer Productivity)**: CLI tool, automated background port checker daemon, and automated browser open commands.
3. **v3 (Reverse Proxy)**: Local reverse proxy support, HTTPS generation (mkcert CA integration), routing `.local` directly without specifying port numbers.
4. **v4 (Team Workspaces)**: Shared profile configurations, cloud workspace sync, and access control integrations.

### 11.2 Risks & Mitigations

* **Permission Denied Errors**: Render clear instructions on passwordless sudo (`chown` or `sudoers`) within the onboarding slide-deck.
* **Domain Conflicts**: Run conflict checkers on imports and show toast warnings for domain collisions.
* **Corrupt JSON Configs**: Run JSON schema validates on startup; fallback to seeded defaults if loading fails.

---

## 12. Project File Structure

```txt
hostpilot/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs              # Tauri command exports, hosts block management
│   │   └── ...
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── i18n/                   # Multi-language translation dictionaries
│   │   ├── en.ts
│   │   ├── th.ts
│   │   └── translations.ts
│   ├── store/
│   │   ├── AppStore.tsx        # Combined React-context state engine
│   │   ├── apiAdapter.ts       # Frontend-to-Backend Tauri invoke adapter
│   │   └── types.ts
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── HostsPage.tsx
│   │   ├── GroupsPage.tsx
│   │   ├── ProfilesPage.tsx
│   │   ├── PortsPage.tsx
│   │   ├── ImportExportPage.tsx
│   │   ├── BackupsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   └── ...
│   ├── hooks/
│   └── ...
├── package.json
└── tsconfig.json
```

---

## 13. Implementation Checklist

### 13.1 Core Features Checklist
- [x] **Hosts Entry Management**: Add, edit, delete entries, validation rules, toggle switches, filter by groups, and live preview changes.
- [x] **Groups / Categories**: CRUD groups, customizable colors, safety warnings before removing active groups.
- [x] **Profiles / Config Sets**: Map entries, duplicate profiles, favorite profile tags, export local JSON configuration.
- [x] **Dashboard & Recents**: State summaries, quick-apply alert confirmation, and recent profiles switcher.
- [x] **Port Management (Metadata MVP)**: Port list mappings, reachability indicator badges, mock launch commands.
- [x] **Backups**: Auto-backups, viewer tables, delete and restore simulations.
- [x] **Config Imports & Exports**: Full config backup serialization in `hostpilot.config.json` via file downloads.

### 13.2 Rust/Tauri Background Communication Checklist
- [x] **System Hosts File I/O & Safety (Rust Engine)**:
  - `read_hosts_file` command.
  - `get_hosts_diff(block_name, entries)` diff generation.
  - `write_hosts_block(block_name, entries)` and `remove_hosts_block(block_name)`.
  - Multi-platform privilege elevation prompts (`osascript`, `pkexec`, PowerShell `runAs`).
- [x] **Backup & Recovery Operations**:
  - `backup_hosts_file` to `~/.hostpilot/backups/`.
  - `list_backups` and `restore_backup(id)`.
- [x] **Local Configuration & Utilities**:
  - `load_app_config` and `save_app_config`.
  - Socket TCP check (`check_port`).
  - Native utilities (`reveal_in_finder`, `open_in_browser`).
- [x] **Welcome Onboarding Modal**:
  - Welcome, security policies, privilege guides, bypass chown scripts.
  - State persistence in config (`onboarded` flag).
- [x] **Settings Page & Preferences Persistence**:
  - [x] Tauri Command: `get_default_hosts_path`.
  - [x] Tauri Command: `select_backup_directory` using directory pickers.
  - [x] Settings Integration in `AppStore` (persist to config disk path).
  - [x] Theme Switching Event Integration (sync html class lists with system/dark/light values).
- [x] **Multi-language (i18n) Integration (EN / TH)**:
  - [x] Tauri Command: `get_system_locale` to detect defaults on startup.
  - [x] Translation Dictionaries: mappings for English and Thai locale keys.
  - [x] Integration Approach: lightweight custom Translation hook inside `translations.ts` and `AppStore.tsx`.
  - [x] Language Switcher UI inside `SettingsPage.tsx` with settings persistence.

---

## 14. Design Adjustments & Historical Decisions

- **Single Store Hook**: Consolidating Zustand stores into `AppStore.tsx` simplified context access across pages and ensured settings modifications (like theme and language) update UI elements instantly.
- **Import/Export Scope Limitation**: Removed raw text configs upload on the main Import/Export tab to isolate config synchronization to the full JSON schema.
- **Release Automation**: Updated packaging tasks to verify git states are clean before bumping version tags. Version numbers displayed on the Settings page are synchronized dynamically during compilation.

---

## 15. Suggested README Draft

```markdown
# hostpilot

A safe, visual desktop manager for system hosts file entries and web port catalogs.

## Features
- 🗂 **Groups & Categorization**: Label domains and assign colors.
- 🔀 **Environment Profiles**: Switch configurations with a single click.
- 🔍 **Safety Previews**: Verify unified diffs before writing.
- 💾 **Automated Backups**: Backs up current files before committing modifications.
- 🌐 **Localized**: Includes English and Thai translations.

## Technical Stack
- Tauri (Rust background service)
- React + TypeScript
- Tailwind CSS & shadcn/ui

## Getting Started
```bash
# Clone the repository
git clone https://github.com/your-username/hostpilot.git
cd hostpilot

# Install dependencies
npm install

# Run the dev instance
npm run tauri dev
```
```
