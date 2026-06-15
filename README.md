<p align="center">
  <img src="./src/assets/logo.png" width="128" height="128" alt="Host Pilot Logo" />
</p>

<h1 align="center">Host Pilot</h1>

<p align="center">
  A desktop app for managing local domain mappings in your system hosts file — built for developers who run production-like local environments.
</p>

<p align="center">
  <strong>Built with Tauri · React · TypeScript · shadcn/ui · Tailwind CSS</strong>
</p>

---

## What it does

hostpilot lets you manage `/etc/hosts` entries without ever touching the file directly. You can organize host entries into groups, save them as environment-specific profiles, and hostpilot will safely write, validate, preview, and apply only a managed block — leaving everything else in your hosts file untouched.

```
# >>> HostPilot START: demo-local
127.0.0.1   web.local
127.0.0.1   api.local
127.0.0.1   admin.local
# <<< HostPilot END: demo-local
```

---

## Features

- **Hosts management** — add, edit, enable/disable, and organize entries by group
- **Groups** — color-coded categories (Frontend, Backend, Admin, Staging…)
- **Profiles** — save and switch between environment configurations instantly
- **Port metadata** — track which local port each domain points to, check live status
- **Import / Export** — share configurations via `hostpilot.config.json`
- **Backups** — automatic snapshot before every write, one-click restore
- **Safe writes** — only manages its own block, never overwrites user entries
- **Diff preview** — review changes before applying to the system hosts file

---

## Configuration format

You can share or import your configurations using the `hostpilot.config.json` format:

### `hostpilot.config.json`

```json
{
  "version": "1.0.0",
  "project": "demo-local",
  "name": "Demo Local ENV",
  "entries": [
    { "domain": "web.local", "ip": "127.0.0.1", "enabled": true, "group": "frontend" },
    { "domain": "api.local", "ip": "127.0.0.1", "enabled": true, "group": "backend" }
  ],
  "ports": [
    { "domain": "web.local", "targetHost": "127.0.0.1", "port": 3000, "protocol": "http" },
    { "domain": "api.local", "targetHost": "127.0.0.1", "port": 8080, "protocol": "http" }
  ]
}
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) (Rust) |
| UI framework | [React 19](https://react.dev) + TypeScript |
| Component library | [shadcn/ui](https://ui.shadcn.com) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Build tool | [Vite](https://vite.dev) |
| Package manager | [pnpm](https://pnpm.io) |

---

## Getting started

### Prerequisites

- [Rust](https://rustup.rs) (stable toolchain)
- [Node.js](https://nodejs.org) ≥ 20
- [pnpm](https://pnpm.io) ≥ 9

### Install dependencies

```bash
pnpm install
```

### Run in development

```bash
pnpm tauri dev
```

### Build for production

```bash
pnpm tauri build
```

### How to Release

A helper script is provided to automate version bumping, tagging, and pushing. You can run it via the npm/pnpm script:

```bash
pnpm release
```

Or execute the script directly:

```bash
./scripts/release.sh
```

This script will:
1. Prompt for the new version.
2. Update versions in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
3. Update `Cargo.lock` by running `cargo check`.
4. Commit the changes and tag them (e.g. `v1.0.0`).
5. Ask to push to origin, which triggers the GitHub Action release build.

---

## Roadmap

| Version | Focus |
|---|---|
| **v1 — Personal MVP** | Local usage, configuration import/export, safe writes, backups |
| **v2 — Developer Productivity** | Port health check, browser open, config templates, CLI |
| **v3 — Reverse Proxy** | Local proxy so domains map to ports without port numbers |
| **v4 — Team Tool** | Shared profiles, Git-based config sync, team templates |

---

## IDE setup

- [VS Code](https://code.visualstudio.com/) + [Tauri extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
