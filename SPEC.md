# hostpilot — MVP Technical Specification

> Version: 1.0.0 | Date: 2026-06-10 | Status: Draft

---

## 1. Product Overview

**hostpilot** is a cross-platform desktop application (macOS, Linux, Windows) built with Tauri + React + TypeScript + shadcn/ui that gives developers a safe, visual interface for managing their system hosts file (`/etc/hosts`).

Instead of manually editing a privileged system file, developers can:
- Organize local domain mappings into named groups
- Bundle entries into reusable environment profiles
- Import project-specific `.hostpilot/hosts.local` files
- Preview diffs, apply changes, and restore backups — all from a polished GUI

hostpilot writes only a clearly-delimited "managed block" inside the hosts file, leaving all user-managed entries untouched.

---

## 2. Problem Statement

| Pain Point | Detail |
|---|---|
| Manual `sudo nano /etc/hosts` editing | Error-prone, no history, no preview |
| No grouping or labeling | Developers accumulate dozens of unlabeled entries |
| Environment switching | Switching between staging/local/prod configs requires manual edits |
| Team onboarding | New devs copy-paste entries from Slack/Notion with no validation |
| Port confusion | Knowing which domain maps to which local port lives only in memory |
| Accidental overwrites | One bad save can break all local services |

---

## 3. Target Users

| Persona | Description |
|---|---|
| **Solo Developer** | Manages multiple local projects with custom domains |
| **Full-Stack Dev** | Runs frontend + backend + admin on separate `.local` domains |
| **DevOps / Platform Eng** | Sets up production-simulation environments locally |
| **Team Lead** | Distributes standardized env configs to team members |

---

## 4. Main Use Cases

1. Add `web.local → 127.0.0.1` and activate it with one click
2. Import a project's `.hostpilot/hosts.local` and apply it safely
3. Switch between "Staging Simulation" and "Local Dev" profiles instantly
4. Preview the diff before any write to `/etc/hosts`
5. Restore a backup if something breaks
6. See which port each domain maps to (metadata only in MVP)

---

## 5. Feature List

### 5.1 Host Entry Management
- Add / Edit / Delete host entries
- Enable / disable individual entries
- Domain format validation (RFC-compliant)
- IP address validation (IPv4 + IPv6)
- Duplicate domain detection
- Search & filter by domain, group, or source
- Batch enable / disable

### 5.2 Project Hosts File Support
- Import `.hostpilot/hosts.local` from any local path
- Parse and validate hosts-file syntax
- Preview imported entries before applying
- Detect conflicts with existing entries
- Apply project block to `/etc/hosts`
- Remove a project's managed block
- Re-apply when `hosts.local` changes

### 5.3 Groups / Categories
- Create / rename / delete groups
- Assign a color to each group
- Assign host entries to groups
- Filter entries by group

### 5.4 Profiles / Config Sets
- Create / edit / duplicate / delete profiles
- Activate / deactivate a profile (writes/removes its block)
- Only one profile can be active per "slot" (configurable)
- Mark a profile as favorite
- Export profile to `hostpilot.config.json`
- Import profile from `hostpilot.config.json`

### 5.5 Recents
- Track recently activated profiles (last 10)
- Track recently opened project paths (last 10)
- One-click reactivation from dashboard

### 5.6 Port Metadata (MVP — no proxy)
- Add / edit / delete port rules linked to a domain
- Record `targetHost`, `port`, and `protocol`
- "Open in browser" button (`http://localhost:3000`)
- Port reachability check (TCP connect test)

### 5.7 Hosts File Safety
- Read current `/etc/hosts` on startup
- Write only inside `# >>> HostPilot START / END` markers
- Never touch lines outside managed blocks
- Auto-backup before every write
- Preview diff (unified format) before applying
- Restore any backup with one click

### 5.8 Import / Export
- Export full app config to `hostpilot.config.json`
- Import and validate with Zod schema
- Merge or replace import strategy (user choice)
- Export a single profile or all profiles

### 5.9 Settings
- Default backup directory
- Max backup count (default: 20)
- Hosts file path override
- Theme (light / dark / system)
- App language (future)

---

## 6. MVP Scope (v1)

### Included in MVP
- [x] Read system hosts file
- [x] Write managed hosts block (safe block strategy)
- [x] Auto-backup before every write
- [x] Add / edit / delete / enable / disable host entries
- [x] Groups with colors
- [x] Profiles: create, activate, deactivate, duplicate, export, import
- [x] Recent profiles & projects (last 10 each)
- [x] Import `.hostpilot/hosts.local`
- [x] Import / export `hostpilot.config.json`
- [x] Conflict detection for duplicate domains
- [x] Diff preview before applying
- [x] Port metadata (no proxy)
- [x] Backup viewer & restore
- [x] Basic Dashboard

### Out of Scope for MVP
- [ ] Built-in reverse proxy
- [ ] HTTPS/TLS local certificate generation
- [ ] Caddy / Nginx config generation
- [ ] Auto-detect all running local ports
- [ ] Team sync / cloud storage
- [ ] Git-based config sync
- [ ] CLI tool
- [ ] Advanced audit/activity log
- [ ] Multi-user / RBAC

---

## 7. Data Model

### 7.1 HostEntry

```ts
type HostEntry = {
  id: string;           // nanoid
  domain: string;       // e.g. "web.local"
  ip: string;           // e.g. "127.0.0.1"
  enabled: boolean;
  groupId?: string;
  description?: string;
  source: "manual" | "imported" | "project-file";
  createdAt: string;    // ISO 8601
  updatedAt: string;
};
```

### 7.2 HostGroup

```ts
type HostGroup = {
  id: string;
  name: string;
  description?: string;
  color?: string;       // hex color
};
```

### 7.3 HostProfile

```ts
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
```

### 7.4 PortRule

```ts
type PortRule = {
  id: string;
  domain: string;
  targetHost: string;   // "127.0.0.1"
  port: number;         // 1–65535
  protocol: "http" | "https";
  enabled: boolean;
};
```

### 7.5 RecentProfile

```ts
type RecentProfile = {
  profileId: string;
  activatedAt: string;
};
```

### 7.6 RecentProject

```ts
type RecentProject = {
  projectPath: string;
  name: string;
  activatedAt: string;
};
```

### 7.7 BackupRecord

```ts
type BackupRecord = {
  id: string;
  filePath: string;     // absolute path to backup file
  createdAt: string;
  reason: string;       // "apply-profile" | "import" | "manual"
};
```

### 7.8 AppConfig (root storage — MVP uses JSON file)

```ts
type AppConfig = {
  version: string;
  entries: HostEntry[];
  groups: HostGroup[];
  profiles: HostProfile[];
  portRules: PortRule[];
  recentProfiles: RecentProfile[];
  recentProjects: RecentProject[];
  backups: BackupRecord[];
  settings: AppSettings;
};

type AppSettings = {
  hostsFilePath: string;
  backupDir: string;
  maxBackups: number;
  theme: "light" | "dark" | "system";
};
```

---

## 8. Config File Schemas

### 8.1 `.hostpilot/hosts.local`

Plain hosts-file syntax. Comments allowed.

```txt
# Project: Demo Local ENV

127.0.0.1  web.local
127.0.0.1  api.local
127.0.0.1  admin.local
```

### 8.2 `.hostpilot/hostpilot.config.json`

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
    },
    {
      "domain": "api.local",
      "ip": "127.0.0.1",
      "enabled": true,
      "group": "backend"
    }
  ],
  "ports": [
    {
      "domain": "web.local",
      "targetHost": "127.0.0.1",
      "port": 3000,
      "protocol": "http"
    },
    {
      "domain": "api.local",
      "targetHost": "127.0.0.1",
      "port": 8080,
      "protocol": "http"
    }
  ]
}
```

### 8.3 Zod Schema for Config Import

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

---

## 9. Hosts File Writing Strategy

### 9.1 Managed Block Format

```txt
# >>> HostPilot START: demo-local
127.0.0.1  web.local
127.0.0.1  api.local
127.0.0.1  admin.local
# <<< HostPilot END: demo-local
```

### 9.2 Write Rules

| Rule | Detail |
|---|---|
| Never overwrite whole file | Read current file, only replace content between markers |
| Multiple blocks allowed | Each profile/project gets its own named block |
| Idempotent writes | Applying the same profile twice doesn't duplicate entries |
| Disabled entries omitted | `enabled: false` entries are not written to hosts |
| Backup before every write | Timestamped copy saved to `backupDir` |
| Diff preview | Unified diff shown to user before confirming |
| Restore | Replace current hosts with any backup file |

### 9.3 Write Algorithm (pseudocode)

```
1. Read current /etc/hosts as string
2. Parse into: [userLines, managedBlocks]
3. Build new managed block for active profile
4. Replace existing block with same name (or append if new)
5. Generate diff between current and new content
6. Show diff to user — wait for confirmation
7. Backup current hosts file to backupDir/hosts-{timestamp}
8. Write new content to /etc/hosts (with elevated permission)
9. Record backup in app config
```

---

## 10. Permission & Security Strategy

### 10.1 macOS

- Tauri Shell plugin: use `osascript` to run privileged write with user password prompt
- Command template: `echo "{content}" | sudo tee /etc/hosts > /dev/null`
- Shell injection prevention: never interpolate user input into the shell string; pass content via temp file
- Temp file: write content to a temp file in app data dir, then `sudo cp {tempFile} /etc/hosts`

### 10.2 Linux

- Use `pkexec` (PolicyKit) for graphical privilege escalation
- Fallback: `sudo` via terminal
- Same temp-file strategy as macOS to avoid injection

### 10.3 Windows

- Hosts file: `C:\Windows\System32\drivers\etc\hosts`
- Use Tauri's `runas` / UAC elevation
- Write via elevated PowerShell: `Start-Process powershell -Verb runAs -ArgumentList ...`
- Same temp-file + copy strategy

### 10.4 Security Checklist

| Risk | Mitigation |
|---|---|
| Shell injection | Never interpolate user content into shell; use temp file copy |
| Accidental full overwrite | Block-only write strategy; always backup first |
| Invalid hosts entry | Zod validation before any write |
| Duplicate entries | Conflict detection at import and apply time |
| Lost user entries | Non-managed lines are preserved in memory during read/write cycle |
| Backup corruption | Write backup before write; verify file size after write |

---

## 11. Project File Structure

```txt
hostpilot/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── hosts/
│   │   │   ├── reader.rs       # Read /etc/hosts
│   │   │   ├── writer.rs       # Write managed block
│   │   │   ├── backup.rs       # Backup & restore
│   │   │   ├── parser.rs       # Parse hosts file lines
│   │   │   └── diff.rs         # Generate unified diff
│   │   ├── config/
│   │   │   ├── loader.rs       # Load/save app config JSON
│   │   │   └── validator.rs    # Validate import schema
│   │   ├── ports/
│   │   │   └── checker.rs      # TCP port reachability
│   │   └── commands.rs         # Tauri command handlers
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── store/                  # Zustand stores
│   │   ├── entriesStore.ts
│   │   ├── groupsStore.ts
│   │   ├── profilesStore.ts
│   │   ├── portStore.ts
│   │   ├── recentsStore.ts
│   │   └── settingsStore.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Projects.tsx
│   │   ├── Profiles.tsx
│   │   ├── Hosts.tsx
│   │   ├── Groups.tsx
│   │   ├── Ports.tsx
│   │   ├── ImportExport.tsx
│   │   ├── Backups.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── hosts/
│   │   │   ├── HostEntryRow.tsx
│   │   │   ├── HostEntryForm.tsx
│   │   │   └── DiffPreview.tsx
│   │   ├── profiles/
│   │   │   ├── ProfileCard.tsx
│   │   │   └── ProfileForm.tsx
│   │   ├── ports/
│   │   │   ├── PortRuleRow.tsx
│   │   │   └── PortStatusBadge.tsx
│   │   └── ui/                 # shadcn/ui generated components
│   │       ├── button.tsx
│   │       ├── badge.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── table.tsx
│   │       ├── switch.tsx
│   │       ├── select.tsx
│   │       ├── sheet.tsx
│   │       ├── card.tsx
│   │       ├── separator.tsx
│   │       ├── tooltip.tsx
│   │       └── sonner.tsx      # Toast notifications
│   ├── hooks/
│   │   ├── useHostsFile.ts
│   │   ├── usePortCheck.ts
│   │   └── useImport.ts
│   ├── lib/
│   │   ├── tauri.ts            # Typed Tauri invoke wrappers
│   │   ├── validators.ts       # Zod schemas
│   │   └── utils.ts
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── .hostpilot/                 # Example project config (dogfooding)
│   ├── hosts.local
│   └── hostpilot.config.json
├── components.json             # shadcn/ui config
├── package.json
├── tsconfig.json
├── vite.config.ts
├── PLANNING.md
├── SPEC.md
└── README.md
```

---

## 11.5 shadcn/ui Component Mapping

shadcn/ui is used as the primary UI component library. Components are installed on-demand via the CLI (`npx shadcn@latest add <component>`) and live in `src/components/ui/`.

| UI Need | shadcn/ui Component |
|---|---|
| Buttons (primary, ghost, destructive) | `Button` |
| Data tables (hosts, ports, backups) | `Table` |
| Forms (add/edit entry, profile) | `Input`, `Label`, `Select`, `Textarea` |
| Enable/disable toggle | `Switch` |
| Slide-in edit panel | `Sheet` |
| Confirmation dialogs | `Dialog` / `AlertDialog` |
| Diff preview overlay | `Dialog` + `ScrollArea` |
| Status indicators | `Badge` |
| Group color picker | `Popover` + custom color grid |
| Sidebar navigation | `Separator` + custom nav items |
| Notifications / toasts | `Sonner` |
| Tooltips on icon buttons | `Tooltip` |
| Dashboard stat cards | `Card` |
| Dropdown action menus | `DropdownMenu` |
| File path display | `Input` (read-only) + `Button` (browse) |
| Theme toggle | `Select` or custom icon button |
| Command palette (future) | `Command` |

### Setup Commands

```bash
# Initialize shadcn/ui in the project
npx shadcn@latest init

# Install components used in MVP
npx shadcn@latest add button badge input label select textarea switch \
  table sheet dialog alert-dialog card separator scroll-area \
  tooltip popover dropdown-menu sonner
```

### `components.json` (shadcn config)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

> **Note:** shadcn/ui requires Tailwind CSS. Since this is a Tauri + Vite project (not Next.js), install Tailwind via `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`.

---

## 12. UI Page Structure

### 12.1 Dashboard

- Active profile badge + deactivate button
- Active project name
- Quick stats: enabled hosts count, active groups, last backup time
- Recent profiles list (click to reactivate)
- Recent projects list (click to re-import)
- Hosts file status indicator (clean / modified / error)
- "Apply Active Profile" CTA button

### 12.2 Hosts Page

- Table: domain | IP | group | source | status toggle | actions
- Search bar (filter by domain)
- Group filter dropdown
- "Add Entry" button → slide-in form
- Inline enable/disable toggle
- Batch selection + bulk enable/disable/delete

### 12.3 Groups Page

- Card grid of groups with color swatches
- Entry count per group
- Create / rename / delete group
- Color picker

### 12.4 Profiles Page

- Card list: profile name | entry count | last activated | favorite star
- Activate / deactivate button on each card
- Create / duplicate / delete profile
- Export profile button
- "Import Profile" button → file picker

### 12.5 Projects Page

- List of recently opened project paths
- "Open Project Folder" button → folder picker → auto-detect `.hostpilot/`
- Preview `hosts.local` content
- "Import to App" button
- Remove project from list

### 12.6 Ports Page

- Table: domain | target | port | protocol | status | open | actions
- Port status badge (green = reachable, red = not reachable, grey = unchecked)
- "Check All" button
- "Open in Browser" icon button
- Add / edit / delete port rules

### 12.7 Import / Export Page

- Import section: drag-and-drop or file picker for `hostpilot.config.json`
- Import options: Merge / Replace
- Preview imported entries before confirming
- Export section: export all or export selected profile
- Export includes: entries, groups, ports, profile metadata

### 12.8 Backups Page

- List: timestamp | file size | reason | actions
- "Restore" button with confirmation dialog
- "Delete" backup
- "Open backup file" (reveal in Finder / Explorer)
- Max backups setting link

### 12.9 Settings Page

- Hosts file path (default per OS, overridable)
- Backup directory path
- Max backup count
- Theme toggle (light / dark / system)
- "Open App Data Folder" button
- "Reset All Data" (destructive, with confirmation)

---

## 13. Tauri Command API

```ts
// Hosts file
invoke("read_hosts_file") → string
invoke("write_hosts_block", { blockName: string, entries: HostEntry[] }) → void
invoke("remove_hosts_block", { blockName: string }) → void
invoke("get_hosts_diff", { blockName: string, entries: HostEntry[] }) → string
invoke("backup_hosts_file") → BackupRecord
invoke("restore_backup", { backupId: string }) → void
invoke("list_backups") → BackupRecord[]

// Config
invoke("load_app_config") → AppConfig
invoke("save_app_config", { config: AppConfig }) → void
invoke("import_config_file", { filePath: string }) → HostpilotConfig
invoke("export_config_file", { config: HostpilotConfig, filePath: string }) → void

// Ports
invoke("check_port", { host: string, port: number }) → boolean

// System
invoke("open_in_browser", { url: string }) → void
invoke("reveal_in_finder", { path: string }) → void
invoke("get_default_hosts_path") → string
```

---

## 14. State Management

Use **Zustand** with persistence via `localStorage` (MVP) or Tauri's app data dir JSON.

```ts
// entriesStore
{
  entries: HostEntry[];
  addEntry: (e: HostEntry) => void;
  updateEntry: (id: string, updates: Partial<HostEntry>) => void;
  deleteEntry: (id: string) => void;
  toggleEntry: (id: string) => void;
}

// profilesStore
{
  profiles: HostProfile[];
  activeProfileId: string | null;
  activateProfile: (id: string) => Promise<void>;
  deactivateProfile: (id: string) => Promise<void>;
  // ...CRUD
}
```

---

## 15. CLI Command Proposal

### MVP (v1) — Not Included
CLI is out of scope for MVP. Desktop app only.

### v2 CLI (planned)

```bash
hostpilot init                        # Create .hostpilot/ in current dir
hostpilot import .hostpilot/hosts.local  # Import project hosts file
hostpilot apply [profile-name]        # Apply a profile to /etc/hosts
hostpilot diff [profile-name]         # Show diff without applying
hostpilot remove [profile-name]       # Remove a managed block
hostpilot restore                     # Restore most recent backup
hostpilot list                        # List all profiles
hostpilot open [domain]               # Open domain in browser
hostpilot status                      # Show current managed blocks
```

---

## 16. Roadmap

### v1 — Personal MVP (current scope)
- Desktop GUI with Tauri + React
- Hosts entry CRUD
- Groups
- Profiles with activation
- Safe block writes + backup
- Project hosts file import
- Config import / export
- Diff preview
- Port metadata + reachability

### v2 — Developer Productivity
- CLI tool (`hostpilot` binary)
- Port health dashboard
- Config templates / starter kits
- Browser "open" quick-action
- Better conflict resolution UI
- Shell completions
- Activity log

### v3 — Reverse Proxy
- Built-in reverse proxy (e.g., using `hyper` in Rust)
- Map `web.local` → `localhost:3000` without port numbers
- HTTPS with local CA (mkcert integration)
- Auto-start proxy on login

### v4 — Team / Internal Tool
- Shared profile library
- Git-based config sync
- Team invite / shared workspace
- Role-based access (viewer / editor / admin)
- Internal documentation per profile
- Export as Caddy / Nginx / Traefik config

---

## 17. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hosts file corruption | Low | Critical | Always backup before write; verify post-write |
| Permission denied errors | Medium | High | Clear error messages; guide user to grant access |
| Shell injection | Low | Critical | Never interpolate user input into shell; use temp files |
| Duplicate domain conflicts | High | Medium | Detect before apply; show conflict UI |
| App config file corruption | Low | High | JSON schema validation on load; auto-backup config |
| Cross-platform path differences | Medium | Medium | Abstract hosts path per OS; test all three |
| Large hosts file performance | Low | Low | Read/write is line-by-line; no full parse needed |
| User accidentally removes app | Low | Medium | Config stored in app data dir, not app bundle |

---

## 18. README Draft

```markdown
# hostpilot

A desktop app for managing local domain mappings — safely, visually, and without touching /etc/hosts by hand.

## Features

- 🗂 Organize domains into groups
- 🔀 Switch between environment profiles instantly
- 📁 Import project-specific `.hostpilot/hosts.local` files
- 🔍 Preview diffs before applying changes
- 💾 Auto-backup before every hosts file write
- 🔌 Track port mappings for local services
- 🔒 Safe block writes — user entries are never touched

## Tech Stack

- [Tauri](https://tauri.app/) (Rust backend)
- [React](https://react.dev/) + TypeScript
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Zustand](https://zustand-demo.pmnd.rs/) for state
- [Zod](https://zod.dev/) for config validation

## Getting Started

```bash
git clone https://github.com/you/hostpilot
cd hostpilot
npm install
npm run tauri dev
```

## Project Config

Create a `.hostpilot/` folder in any project:

```txt
.hostpilot/
├── hosts.local
└── hostpilot.config.json
```

Then import it via the Projects page in hostpilot.

## How It Works

hostpilot reads your system hosts file and only manages its own delimited blocks:

```txt
# >>> HostPilot START: my-project
127.0.0.1  web.local
127.0.0.1  api.local
# <<< HostPilot END: my-project
```

All other lines remain untouched.

## License

MIT
```

---

## 19. Development Task Breakdown

### Phase 1 — Project Setup
- [x] Init Tauri + React + TypeScript project
- [x] Configure Vite, ESLint, Prettier, TypeScript strict mode
- [x] Install and configure Tailwind CSS
- [x] Install and configure shadcn/ui (`npx shadcn@latest init`)
- [x] Install MVP shadcn/ui components (button, table, sheet, dialog, switch, badge, card, sonner, etc.)
- [x] Set up Zustand stores skeleton
- [x] Set up React Router with page stubs
- [x] Customize shadcn/ui theme tokens (colors, radius) to match hostpilot branding

### Phase 2 — Rust Backend (Tauri Commands)
- [ ] `read_hosts_file` command
- [ ] `get_default_hosts_path` per OS
- [ ] Hosts file parser (line-by-line, detect managed blocks)
- [ ] Managed block writer (replace-in-place strategy)
- [ ] Diff generator
- [ ] Backup + restore
- [ ] Port reachability checker (TCP)
- [ ] App config load/save (JSON file in app data dir)
- [ ] Permission elevation (macOS osascript, Linux pkexec, Windows UAC)

### Phase 3 — Core UI
- [x] Sidebar navigation
- [x] Dashboard page
- [x] Hosts page (table + CRUD form)
- [x] Groups page (card grid + CRUD)
- [x] Profiles page (card list + CRUD)
- [x] DiffPreview modal component

### Phase 4 — Import / Export
- [ ] Zod schema for `hostpilot.config.json`
- [ ] Import flow: file picker → validate → preview → merge/replace
- [ ] Export flow: build JSON → save file dialog
- [ ] Project hosts file import (`.hostpilot/hosts.local`)
- [ ] Conflict detection UI

### Phase 5 — Ports & Recents
- [ ] Port rules CRUD
- [ ] Port status checker (invoke Tauri command)
- [ ] "Open in Browser" action
- [ ] Recent profiles & projects tracking
- [ ] Dashboard recents widget

### Phase 6 — Backups & Settings
- [ ] Backup list page
- [ ] Restore backup flow
- [ ] Auto-delete old backups (max count)
- [ ] Settings page (paths, theme, backup count)

### Phase 7 — Polish & Release
- [ ] Error boundary + user-friendly error messages
- [ ] Loading states and skeleton UIs
- [ ] Keyboard shortcuts
- [ ] Dark / light theme
- [ ] App icon and branding
- [ ] macOS `.dmg` build
- [ ] Windows `.msi` build
- [ ] Linux `.AppImage` build

---

## 20. GitHub Issues by Milestone

### Milestone: M1 — Project Bootstrap
- `[setup] Init Tauri + React + TypeScript`
- `[setup] Configure ESLint, Prettier, strict TS`
- `[setup] Install and configure Tailwind CSS`
- `[setup] Install and configure shadcn/ui`
- `[setup] Install MVP shadcn/ui components`
- `[setup] Customize shadcn/ui theme to hostpilot brand`
- `[setup] React Router skeleton with all pages`
- `[setup] Zustand store scaffolding`

### Milestone: M2 — Hosts File Engine
- `[rust] Read /etc/hosts cross-platform`
- `[rust] Parse managed blocks from hosts file`
- `[rust] Write managed block (replace-in-place)`
- `[rust] Generate unified diff`
- `[rust] Backup hosts file before write`
- `[rust] Restore from backup`
- `[rust] Permission elevation (macOS, Linux, Windows)`

### Milestone: M3 — Core UI
- `[ui] Dashboard page`
- `[ui] Hosts CRUD table and form`
- `[ui] Groups management page`
- `[ui] Profiles management page`
- `[ui] DiffPreview modal`
- `[ui] Enable/disable toggle with optimistic update`

### Milestone: M4 — Import / Export
- `[feat] Zod schema for hostpilot.config.json`
- `[feat] Import config with merge/replace strategy`
- `[feat] Export config (all or by profile)`
- `[feat] Import .hostpilot/hosts.local`
- `[feat] Conflict detection and resolution UI`

### Milestone: M5 — Ports & Recents
- `[feat] Port rules CRUD`
- `[feat] Port reachability check`
- `[feat] Open domain in browser`
- `[feat] Recent profiles tracking`
- `[feat] Recent projects tracking`

### Milestone: M6 — Backups & Settings
- `[feat] Backup viewer page`
- `[feat] One-click restore`
- `[feat] Auto-purge old backups`
- `[feat] Settings page`

### Milestone: M7 — Release
- `[release] App icon + branding`
- `[release] Dark/light theme`
- `[release] Error boundaries and messages`
- `[release] macOS .dmg build`
- `[release] Windows .msi build`
- `[release] Linux .AppImage build`
- `[release] README and documentation`
