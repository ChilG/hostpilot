# Project Planning Prompt: hostpilot

## Context

I want to build a personal developer productivity app named **hostpilot**.

hostpilot is a desktop application for managing local domain mappings in the system hosts file, such as `/etc/hosts` on macOS/Linux or the hosts file on Windows.

The main purpose of hostpilot is to help developers run production-like local environments by mapping custom domains to local IP addresses, organizing domains into groups, switching between environment profiles, storing recent configurations, importing/exporting reusable config files, and managing local web port references.

This project should start as a personal project, but it should be designed in a way that can later become an internal developer tool for a team.

---

## Project Name

```txt
hostpilot
```

Recommended naming convention:

```txt
App Name: hostpilot
CLI Name: hostpilot
Config Folder: .hostpilot
Config File: hostpilot.config.json
Project Hosts File: hosts.local
Managed Block Name: HostPilot
```

Example project structure:

```txt
project-root/
├─ .hostpilot/
│  ├─ hosts.local
│  ├─ hostpilot.config.json
│  └─ README.md
```

---

## Main Goal

Design a complete project plan for **hostpilot**, a desktop app that can:

- Manage local domain mappings
- Organize domains by category/group
- Create and activate environment profiles
- Store recently used profiles
- Import and export configuration files
- Read project-specific `.hostpilot/hosts.local` files
- Track port mappings for local web services
- Safely update the system hosts file
- Backup the hosts file before every write
- Avoid overwriting user-managed hosts entries
- Preview changes before applying them

---

## Important Technical Constraints

The hosts file can map only IP addresses to hostnames.

This is valid:

```txt
127.0.0.1 web.local
127.0.0.1 api.local
```

This is not valid:

```txt
127.0.0.1:3000 web.local
```

Therefore, port management should be treated as metadata in the MVP.

Later, hostpilot may support reverse proxy functionality so users can open:

```txt
http://web.local
```

and hostpilot can proxy internally to:

```txt
http://localhost:3000
```

---

## Recommended Tech Stack

Please plan the project using this stack:

```txt
Tauri
React
TypeScript
shadcn/ui (component library)
Tailwind CSS (required by shadcn/ui)
JSON config file for MVP
Zod for config validation
SQLite as future storage option
```

Alternative stack can be mentioned, but the main recommendation should be:

```txt
Tauri + React + TypeScript + shadcn/ui
```

---

## Core Concept

hostpilot should not require users to manually edit `/etc/hosts`.

Instead, each project can have its own `.hostpilot` folder.

Example:

```txt
project-root/
├─ .hostpilot/
│  ├─ hosts.local
│  └─ hostpilot.config.json
```

The `hosts.local` file should contain hosts-style mappings for that specific project:

```txt
# Project: Demo Local ENV

127.0.0.1 web.local
127.0.0.1 api.local
127.0.0.1 admin.local
```

hostpilot should read this file, validate it, preview the diff, backup the system hosts file, and write only a managed block into `/etc/hosts`.

Example managed block:

```txt
# >>> HostPilot START: demo-local
127.0.0.1 web.local
127.0.0.1 api.local
127.0.0.1 admin.local
# <<< HostPilot END: demo-local
```

hostpilot must not overwrite the whole hosts file.

---

## Core Features

### 1. Hosts Entry Management

Each host entry should include:

```ts
type HostEntry = {
  id: string;
  domain: string;
  ip: string;
  enabled: boolean;
  groupId?: string;
  description?: string;
  source?: "manual" | "imported" | "project-file";
  createdAt: string;
  updatedAt: string;
};
```

The app should allow users to:

- Add host entry
- Edit host entry
- Delete host entry
- Enable/disable host entry
- Search domain
- Filter by group
- Validate duplicated domains
- Validate invalid domain format
- Validate invalid IP address
- Preview changes before applying

---

### 2. Project Hosts File

hostpilot should support project-specific hosts files.

Default file path:

```txt
.hostpilot/hosts.local
```

Example:

```txt
127.0.0.1 web.local
127.0.0.1 api.local
127.0.0.1 admin.local
```

The app should support:

- Import `.hostpilot/hosts.local`
- Validate hosts.local format
- Preview imported entries
- Apply project hosts to `/etc/hosts`
- Remove project managed block
- Re-apply updated project hosts
- Detect conflicts with existing domains

---

### 3. Groups / Categories

Each group should include:

```ts
type HostGroup = {
  id: string;
  name: string;
  description?: string;
  color?: string;
};
```

Example groups:

```txt
Frontend
Backend
API
Admin
Operator A
Operator B
Production Simulation
Staging Simulation
```

The app should allow users to organize host entries by group.

---

### 4. Profiles / Config Sets

Each profile represents a reusable environment configuration.

```ts
type HostProfile = {
  id: string;
  name: string;
  description?: string;
  entryIds: string[];
  portRuleIds?: string[];
  createdAt: string;
  updatedAt: string;
};
```

The app should support:

- Create profile
- Edit profile
- Duplicate profile
- Activate profile
- Deactivate profile
- Export profile
- Import profile
- Mark profile as favorite
- Show active profile

---

### 5. Recents

hostpilot should store recently used profiles and projects.

```ts
type RecentProfile = {
  profileId: string;
  activatedAt: string;
};

type RecentProject = {
  projectPath: string;
  name: string;
  activatedAt: string;
};
```

The dashboard should allow quick reactivation of recent profiles or project configs.

---

### 6. Port Management

Port mapping should be metadata in MVP.

```ts
type PortRule = {
  id: string;
  domain: string;
  targetHost: string;
  port: number;
  protocol: "http" | "https";
  enabled: boolean;
};
```

Example:

```txt
web.local → http://127.0.0.1:3000
api.local → http://127.0.0.1:8080
admin.local → http://127.0.0.1:5173
```

MVP should allow:

- Add port rule
- Edit port rule
- Delete port rule
- Open domain with port in browser
- Check whether the port is running

Future version may support:

- Built-in reverse proxy
- Generate Caddy config
- Generate Nginx config
- HTTPS local certificates

---

## Config Files

### hosts.local

Example:

```txt
# Project: Demo Local ENV

127.0.0.1 web.local
127.0.0.1 api.local
127.0.0.1 admin.local
```

### hostpilot.config.json

Example:

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

Import behavior should include:

- Validate config schema
- Preview before import
- Merge with existing config
- Replace existing config
- Detect duplicated domains
- Reject invalid domains
- Reject invalid IP addresses

---

## Hosts File Writing Strategy

hostpilot must not overwrite the entire hosts file.

It should only manage its own blocks.

Example:

```txt
# >>> HostPilot START: demo-local
127.0.0.1 web.local
127.0.0.1 api.local
127.0.0.1 admin.local
# <<< HostPilot END: demo-local
```

Rules:

- Keep user-managed hosts entries untouched
- Only replace content between managed markers
- Support multiple managed blocks by project name
- Create backup before every write
- Show diff preview before applying
- Restore from backup if needed
- Prevent duplicate entries from being appended repeatedly

---

## Security and Permissions

The app needs elevated permissions to write the hosts file.

Please include a security plan for:

- macOS
- Linux
- Windows

The plan should cover:

- Reading hosts file
- Writing hosts file
- Requesting admin permission
- Backup strategy
- Restore strategy
- Preventing accidental overwrite
- Preventing invalid hosts entries
- Avoiding shell injection when requesting permissions

---

## Suggested Pages / UI

Please design the UI structure.

Recommended pages:

```txt
Dashboard
Projects
Profiles
Hosts
Groups
Ports
Import / Export
Backups
Settings
```

Dashboard should show:

- Active profile
- Active project
- Recent profiles
- Recent projects
- Number of enabled hosts
- Hosts file status
- Port status
- Last backup
- Quick apply button

---

## CLI Ideas

hostpilot may support CLI commands in the future.

Example:

```bash
hostpilot init
hostpilot import .hostpilot/hosts.local
hostpilot apply
hostpilot diff
hostpilot remove demo-local
hostpilot restore
hostpilot open web.local
```

Please include which CLI commands should be included in MVP and which should be future scope.

---

## MVP Scope

Please define MVP v1 clearly.

MVP v1 should include:

- Read system hosts file
- Write managed hosts block
- Backup before write
- Add/edit/delete host entry
- Enable/disable host entry
- Import `.hostpilot/hosts.local`
- Import/export `hostpilot.config.json`
- Groups
- Profiles
- Activate profile
- Recent profiles/projects
- Preview diff before apply
- Basic port metadata

MVP v1 should not include:

- Reverse proxy
- HTTPS certificate generation
- Team sync
- Cloud account
- Auto-detect all running ports
- Advanced audit log

---

## Future Roadmap

Please split the roadmap into versions.

Suggested versions:

### v1: Personal MVP

Focus on local usage, project hosts import, safe writes, and backups.

### v2: Developer Productivity

Add port health check, better import/export, config templates, browser open actions, and CLI support.

### v3: Reverse Proxy Support

Add local proxy so domains can map to local ports without typing port numbers.

### v4: Team/Internal Tool

Add shared profiles, team config templates, Git-based config sync, and internal documentation.

---

## Deliverables I Want

Please generate the following:

1. Product overview
2. Problem statement
3. Target users
4. Main use cases
5. Feature list
6. MVP scope
7. Out-of-scope list
8. Data model
9. File structure suggestion
10. `.hostpilot` project config structure
11. Hosts file writing strategy
12. Import/export config schema
13. Permission and security strategy
14. UI page structure
15. CLI command proposal
16. Roadmap
17. Risks and mitigations
18. Suggested README draft
19. Development task breakdown
20. Suggested GitHub issues grouped by milestone

---

## Preferred Output Format

Use clear headings, tables, and code blocks where useful.

Keep the plan practical and suitable for starting implementation.

---

## FE Demo to Background Process Transition Plan (Approved 2026-06-10)

With the frontend mockup completed using React-only mock states, the next milestone focuses on integrating the Rust/Tauri background process.

### 1. Data Flow Architecture
The state is managed in the frontend by `AppStore.tsx`. The integration replaces the in-memory state with a hybrid model:
- **Persistence**: Saved directly to `$APP_DATA_DIR/config.json` via Tauri config loader.
- **Active profile applying**: Generates hosts content, checks for diff, prompts elevated write.
- **Port scans**: On-demand polling of ports using standard Rust sockets.

### 2. Platform Privilege Escalation
To safely modify `/etc/hosts` or the Windows equivalent:
- Write target block updates to a temp file first to prevent shell injection.
- Run a native platform copier command elevated via `osascript` (macOS), `pkexec` (Linux), or UAC / PowerShell `RunAs` (Windows).

### 3. File System Dialogs
Use Native Tauri/Rust open folder dialogs for importing `.hostpilot` project folders.

