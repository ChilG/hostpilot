# HostPilot MVP — Implementation Checklist

This checklist tracks the implementation status of the **hostpilot** desktop UI demo against the specifications outlined in [PLANNING.md](file:///Users/chilgoe/Documents/2026/hostpilot/PLANNING.md).

---

## 🚀 Core Features

### 💻 1. Hosts Entry Management
- [x] **Add Host Entry**: Form dialog with validation inputs.
- [x] **Edit Host Entry**: Modify details inside forms.
- [x] **Delete Host Entry**: AlertDialog confirmation to permanently delete.
- [x] **Enable/Disable Switch**: Inline toggle switches that instantly change the enabled state.
- [x] **Search Domains**: Input filter on the Hosts list page.
- [x] **Filter by Group**: Interactive group selector in the search bar.
- [x] **Validation Rules**:
  - [x] Duplicate domain checks.
  - [x] Domain format validation.
  - [x] IP address format validation (e.g., standard IPv4 syntax).
- [x] **Preview Changes**: Live managed hosts block preview shown on the Dashboard.

### 📁 2. Project Hosts File
- [x] **Import `.hostpilot/hosts.local`**: Read `.local` text file formats using `FileReader` on upload.
- [x] **Format Validation**: Basic parsing logic to separate IP addresses and domain pairs.
- [x] **Preview Imported Entries**: Displays text preview and entry count before applying.
- [x] **Re-apply & Conflict Detection**: Skips duplicates and alerts user via toast updates.

### 🎨 3. Groups / Categories
- [x] **Organize Domains by Group**: Select group from dropdowns in host editor.
- [x] **Group Administration**: CRUD actions to add, edit, and delete groups.
- [x] **Safety Checks**: Prompts warnings if hosts are assigned to a group before deleting it.
- [x] **Group Colors**: Customizable preset swatches in the group creator.

### 📂 4. Profiles / Config Sets
- [x] **Create & Edit Profile**: Scoped editor with scrollable checklists to map host entries.
- [x] **Duplicate Profile**: Clones settings into a new profile `"Copy of [Name]"`.
- [x] **Activate/Deactivate**: Zaps and toggles live profiles from the UI.
- [x] **Export Profile**: Downloads local JSON representation of the profile.
- [x] **Favorites**: Star icons to favorite/unfavorite profiles.
- [x] **Grid Auto-Alignment**: Enforced card constraints (`h-[148px]` flex heights) to ensure clean UX grids for cases of less than 4 host items.

### 📊 5. Dashboard & Recents
- [x] **Live State Summary**: Displays active profile, project, and count statistics.
- [x] **Quick Apply**: Triggers a confirmation `AlertDialog` that runs an automatic backup and applies states.
- [x] **Recent Profile / Project Quick Switching**: Clickable item lists that switch profiles and projects on the fly.
- [x] **Sync & Saved Markers**: Active status indicator banners.

### 🔌 6. Port Management (Metadata MVP)
- [x] **Add/Edit/Delete Port Rule**: Rule creator for reference web ports.
- [x] **Browser Action Simulation**: Open rule links by simulating browser actions and throwing notifications.
- [x] **Port Running Status**: Custom indicators for live reference rules.

### 💾 7. Backups
- [x] **Auto-Backup**: Triggers backup creation automatically before writing changes (e.g. Quick Apply).
- [x] **Backup List**: Displays date, backup reason, and file size.
- [x] **Delete Backups**: Confirms and removes backup snapshots.
- [x] **Restore Backups**: AlertDialog confirmation to simulate restoring a hosts file block from a timestamped backup.

### 📥 8. Config Imports & Exports
- [x] **hostpilot.config.json Export**: Full JSON configuration serialization and browser-native file downloading.
- [x] **Merge Configuration Import**: Interactive upload parsing and importing for full JSON config schema.

---

## 🛠️ Tech Stack & Constraints
- [x] **Tauri Framework**: Configured and running via `src-tauri`.
- [x] **React + TypeScript**: App constructed using type-safe custom Hooks and states.
- [x] **Tailwind CSS + shadcn/ui**: Premium UI styling using HSL color tokens, dark mode containers, custom icons, and transitions.
- [x] **State Scope**: Shared React `AppStoreContext` for full local simulation without requiring external file IO permissions in the browser/client prototype demo.

---

## 🦀 Rust/Tauri Background Communication Roadmap

To transition from the React-only mockup to a fully functional desktop application, we will implement the following Tauri commands and Rust integration tasks:

### 1. System Hosts File I/O & Safety (Rust Engine)
- [x] **Command: `read_hosts_file`**
  - Read system hosts file cross-platform.
- [x] **Command: `get_hosts_diff(block_name, entries)`**
  - Compute a unified diff of changes before applying.
- [x] **Command: `write_hosts_block(block_name, entries)`** & **`remove_hosts_block(block_name)`**
  - Inject/remove named managed blocks (`# >>> HostPilot START: [name]`).
  - Write updated contents to a temp file, then copy to system path with elevation.
- [x] **Privilege Escalation Strategy**:
  - macOS: `osascript` administrator privileges prompt.
  - Linux: `pkexec` graphical elevation.
  - Windows: UAC elevation via PowerShell `RunAs`.

### 2. Backup & Recovery Operations
- [x] **Command: `backup_hosts_file`**
  - Copy hosts to `~/.hostpilot/backups/hosts-{timestamp}` prior to any updates.
- [x] **Command: `list_backups`**
  - Read backups folder and return metadata (timestamp, reason, size).
- [x] **Command: `restore_backup(id)`**
  - Restore a backup using the elevated temp-file copy method.

### 3. Local Configuration & Utilities
- [x] **Command: `load_app_config`** & **`save_app_config`**
  - Read/Write the core app configuration (`config.json`) in the platform App Data directory.
- [x] **Command: `check_port(host, port)`**
  - Check TCP port availability using socket connection checks.
- [x] **Command: `select_project_folder`**
  - Trigger folder selector dialog to import `.hostpilot/hosts.local` config.
- [x] **Command: `reveal_in_finder(path)`** & **`open_in_browser(url)`**
  - Utility commands to open links and show configuration folders.

### 4. Welcome Onboarding Modal (Option A)
- [x] **Onboarding state persistence**: Add `onboarded` flag to `AppConfig` and state store.
- [x] **Multi-slide Welcome dialog component**: Implement step-by-step layout (`Welcome`, `Security`, `Permission Setup`, `Project Guide`).
- [x] **Conditional render hook**: Render Onboarding Modal in `App.tsx` if `!onboarded`.
- [x] **Bypass password script integration**: Provide copyable script for `chown` in Slide 3.

### 5. Project hosts.local Disk Read & System Integration
- [x] **Tauri Command: `read_project_hosts_file`**: Read project-specific `hosts.local` from local disk paths (supporting `~` home expansion in Rust).
- [x] **Frontend AppStore Integration**: Connect project activation/deactivation to write/remove the parsed `hosts.local` entries in the system hosts file.
- [x] **Projects Page UI Enhancements**: Load and preview actual `hosts.local` file contents dynamically, parse entry counts, and handle missing/error file states.

