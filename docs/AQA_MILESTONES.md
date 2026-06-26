# HostPilot — AQA Milestones

> คู่มือนี้ใช้สำหรับ implement ระบบ Automated Quality Assurance ของ HostPilot
> สามารถทำต่อจากจุดที่ค้างไว้ได้โดยดูที่ checkbox ✅ = เสร็จแล้ว, ☐ = ยังไม่ทำ

---

## Architecture Decision Record (สิ่งที่ตัดสินใจแล้ว)

| หัวข้อ | การตัดสินใจ | เหตุผล |
|---|---|---|
| E2E mode | **Tauri mode** (รัน Playwright ต่อ Tauri binary จริง) | ทดสอบ SQLite จริง ครอบคลุมทุก layer |
| E2E Database | **SQLite แยก** ผ่าน `HOSTPILOT_TEST_DATA_DIR` env var | ไม่กระทบ production DB |
| E2E Hosts file | **temp file** ผ่าน `HOSTPILOT_TEST_HOSTS_PATH` env var | ไม่ต้อง sudo, ไม่กระทบ `/etc/hosts` จริง |
| Rust private fns | เปลี่ยนเป็น `pub(crate)` เพื่อให้ test แยกไฟล์ได้ | แยก test ออกจาก source ชัดเจน |
| Test separation | **ห้าม** วาง test files ใน `src/` หรือ `src-tauri/src/` | โครงสร้างสะอาด, production code ไม่ปนกับ test |
| CI/CD | **2 workflows**: fast (unit, ทุก push) + e2e (PR to main เท่านั้น) | ประหยัด CI minutes |
| Rust DB Unit test | SQLite **`:memory:`** ใน `src-tauri/tests/` | ไม่ต้องการ filesystem |

---

## โครงสร้างไฟล์ที่จะสร้าง

```
hostpilot/
│
├── src/                          ← production code (ไม่มี test ใดๆ)
├── src-tauri/
│   ├── src/                      ← production code (ไม่มี test ใดๆ)
│   │   ├── hosts.rs              ← MODIFY: build_managed_block, replace_managed_block → pub(crate)
│   │   ├── db/
│   │   │   └── mod.rs            ← MODIFY: get_db_path + get_backups_dir ใช้ env var override
│   │   └── lib.rs                ← MODIFY: เพิ่ม tauri-plugin-playwright ด้วย feature flag
│   ├── tests/                    ← [NEW] Rust integration/unit tests (แยกจาก src/)
│   │   ├── hosts_tests.rs        ← [NEW] ทดสอบ build_managed_block, replace_managed_block
│   │   ├── db_tests.rs           ← [NEW] ทดสอบ save/load ด้วย SQLite :memory:
│   │   └── config_tests.rs       ← [NEW] ทดสอบ serialization/deserialization
│   └── Cargo.toml                ← MODIFY: feature flag e2e-testing, pub(crate) fns
│
├── tests/                        ← [NEW] ALL non-Rust tests อยู่ที่นี่
│   ├── setup.ts                  ← [NEW] Vitest global setup (mock Tauri, mock apiAdapter)
│   ├── unit/                     ← [NEW] Frontend unit tests
│   │   └── store/
│   │       ├── types.test.ts
│   │       └── slices/
│   │           ├── hostsSlice.test.ts
│   │           ├── groupsSlice.test.ts
│   │           ├── profilesSlice.test.ts
│   │           ├── backupsSlice.test.ts
│   │           ├── importSlice.test.ts
│   │           └── notificationsSlice.test.ts
│   └── e2e/                      ← [NEW] Playwright E2E tests
│       ├── playwright.config.ts
│       ├── global-setup.ts
│       └── specs/
│           ├── navigation.spec.ts
│           ├── hosts.spec.ts
│           ├── profiles.spec.ts
│           ├── groups.spec.ts
│           └── import.spec.ts
│
├── .github/
│   └── workflows/
│       ├── test-unit.yml         ← [NEW] Unit tests (ทุก push)
│       └── test-e2e.yml          ← [NEW] E2E tests (PR to main เท่านั้น)
│
├── vitest.config.ts              ← [NEW]
└── package.json                  ← MODIFY: เพิ่ม test scripts + devDeps
```

---

## Milestone 1 — Project Setup & Configuration

### 1.1 — ติดตั้ง Frontend test dependencies

```bash
pnpm add -D vitest @vitest/coverage-v8 \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom \
  @playwright/test
```

**ไฟล์ที่ต้องสร้าง/แก้ไข:**

- [x] `vitest.config.ts` — root config
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
```

- [x] `tests/setup.ts` — Global mock setup
```ts
import '@testing-library/jest-dom'

// isTauri = false ในทุก unit test
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: undefined,
  writable: true,
})

// mock apiAdapter ทั้งหมด
vi.mock('@/store/apiAdapter', () => ({
  apiAdapter: {
    loadAppConfig: vi.fn().mockResolvedValue(null),
    saveAppConfig: vi.fn().mockResolvedValue(undefined),
    backupHostsFile: vi.fn().mockResolvedValue({ id: 'b_1', createdAt: new Date().toISOString(), reason: 'test', size: '1 KB' }),
    deleteBackupFile: vi.fn().mockResolvedValue(undefined),
    restoreBackup: vi.fn().mockResolvedValue(undefined),
    checkPort: vi.fn().mockResolvedValue(false),
    resolveDynamicHost: vi.fn().mockResolvedValue('resolved.local'),
  },
}))
```

- [x] `package.json` — เพิ่ม scripts:
```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage",
"test:e2e":      "playwright test --config=tests/e2e/playwright.config.ts",
"build:e2e":     "cargo tauri build --debug --features e2e-testing",
```

---

### 1.2 — เพิ่ม Rust Feature Flag สำหรับ E2E

- [x] `src-tauri/Cargo.toml` — เพิ่ม:
```toml
[features]
e2e-testing = ["dep:tauri-plugin-playwright"]

[dependencies]
tauri-plugin-playwright = { version = "0.1", optional = true }
```

- [x] `src-tauri/src/lib.rs` — เพิ่มใน `run()`:
```rust
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // ... existing plugins ...

    #[cfg(feature = "e2e-testing")]
    {
        builder = builder.plugin(tauri_plugin_playwright::init());
    }

    builder
        .invoke_handler(tauri::generate_handler![ ... ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### 1.3 — DB + Hosts Path Isolation (env var override)

- [x] `src-tauri/src/db/mod.rs` — แก้ `get_db_path()`:
```rust
pub fn get_db_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    #[cfg(debug_assertions)]
    if let Ok(test_dir) = std::env::var("HOSTPILOT_TEST_DATA_DIR") {
        return Ok(std::path::PathBuf::from(test_dir).join("hostpilot.db"));
    }
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_dir.join("hostpilot.db"))
}
```

- [x] `src-tauri/src/hosts.rs` — แก้ `get_hosts_path()` และ `get_backups_dir()`:
```rust
pub fn get_hosts_path() -> std::borrow::Cow<'static, str> {
    #[cfg(debug_assertions)]
    if let Ok(test_path) = std::env::var("HOSTPILOT_TEST_HOSTS_PATH") {
        return std::borrow::Cow::Owned(test_path);
    }
    #[cfg(target_os = "windows")]
    return std::borrow::Cow::Borrowed("C:\\Windows\\System32\\drivers\\etc\\hosts");
    #[cfg(not(target_os = "windows"))]
    return std::borrow::Cow::Borrowed("/etc/hosts");
}

// get_backups_dir() → เพิ่ม env var override ในลักษณะเดียวกัน
```

> ⚠️ `get_hosts_path()` เปลี่ยน return type จาก `&'static str` เป็น `Cow<'static, str>`
> ต้องอัปเดต callers ทุกจุดใน `hosts.rs` ด้วย

- [x] แก้ `read_hosts_file()` และทุก caller ของ `get_hosts_path()` ให้ใช้ type ใหม่

---

### 1.4 — เปลี่ยน Private Functions เป็น `pub(crate)`

- [x] `src-tauri/src/hosts.rs` — เปลี่ยน:
```rust
// จาก
fn build_managed_block(block_name: &str, entries: &[HostEntry]) -> String
fn replace_managed_block(original_content: &str, block_name: &str, ...) -> String

// เป็น
pub(crate) fn build_managed_block(block_name: &str, entries: &[HostEntry]) -> String
pub(crate) fn replace_managed_block(original_content: &str, block_name: &str, ...) -> String
```

---

## Milestone 2 — Rust Unit Tests

ไฟล์ test อยู่ใน `src-tauri/tests/` (Rust integration test convention)

### 2.1 — hosts_tests.rs

- [x] `src-tauri/tests/hosts_tests.rs` — สร้างใหม่

**`build_managed_block` tests:**
- [x] `test_build_block_with_enabled_entries` — มี START/END markers
- [x] `test_build_block_all_disabled` — return empty string
- [x] `test_build_block_mixed_enabled` — แสดงเฉพาะ enabled
- [x] `test_build_block_format` — format ถูกต้อง `{ip}   {domain}\n`

**`replace_managed_block` tests:**
- [x] `test_replace_append_new_block` — append เข้าไฟล์ที่ยังไม่มี block
- [x] `test_replace_existing_block` — replace block ที่มีอยู่แล้ว
- [x] `test_replace_remove_block` — empty new_block → ลบ block ออก
- [x] `test_replace_conflict_detection` — domain ซ้ำ → `# [HostPilot Overridden]`
- [x] `test_replace_no_false_positive_in_comment` — domain ใน comment ไม่ถูก override
- [x] `test_replace_trailing_newline` — trailing newline preservation
- [x] `test_replace_crlf_input` — CRLF normalize ถูกต้อง
- [x] `test_replace_multiple_non_hp_entries` — ไฟล์ที่มีหลาย entries ไม่ถูก corrupt
- [x] `test_replace_blank_line_before_append` — spacing ก่อน appended block

### 2.2 — db_tests.rs

- [x] `src-tauri/tests/db_tests.rs` — สร้างใหม่

```rust
// helper ในไฟล์นี้
fn create_test_db() -> rusqlite::Connection {
    let mut conn = rusqlite::Connection::open(":memory:").unwrap();
    hostpilot_lib::db::init_db_from_conn(&mut conn).unwrap();
    conn
}
```

> ต้อง expose `init_db_from_conn(conn: &mut Connection)` จาก `db/mod.rs` เพื่อให้ test ใช้ได้

**Tests:**
- [x] `test_save_and_load_hosts_round_trip`
- [x] `test_save_and_load_groups_round_trip`
- [x] `test_save_and_load_profiles_with_entry_ids`
- [x] `test_save_and_load_profiles_with_group_ids`
- [x] `test_save_idempotency` — save 2 ครั้ง → ได้ผลเดิม
- [x] `test_orphaned_entry_ids_silently_skipped`
- [x] `test_orphaned_group_ids_silently_skipped`
- [x] `test_save_and_load_settings_json_blob`

### 2.3 — config_tests.rs

- [x] `src-tauri/tests/config_tests.rs` — สร้างใหม่
- [x] `test_host_entry_round_trip`
- [x] `test_optional_fields_absent_in_json`
- [x] `test_proxy_rule_boolean_defaults`
- [x] `test_app_config_empty_round_trip`

**วิธีรัน:**
```bash
cd src-tauri && cargo test
```

---

## Milestone 3 — Frontend Unit Tests (Vitest)

ไฟล์ test อยู่ใน `tests/unit/` (ไม่ใช่ `src/`)

### 3.1 — types.test.ts

- [x] `tests/unit/store/types.test.ts`

**`isHostInProfile` tests:**
- [x] host ใน `entryIds` → true
- [x] host ไม่ใน `entryIds` → false
- [x] host's `groupId` อยู่ใน `groupIds` → true
- [x] host's `groupId` ไม่อยู่ใน `groupIds` → false
- [x] `profile = null` → false
- [x] host ไม่มี `groupId` + ไม่ใน `entryIds` → false

**`getProfileHosts` tests:**
- [x] return union ของ entryIds + groupIds
- [x] ไม่มี duplicate
- [x] `profile = null` → `[]`

### 3.2 — hostsSlice.test.ts

- [x] `tests/unit/store/slices/hostsSlice.test.ts`
- [x] `addHost` — เพิ่ม host
- [x] `addHost` — auto-add ไปยัง active profile `entryIds`
- [x] `addHost` — ไม่ double-add ถ้า host's group อยู่ใน `groupIds` แล้ว
- [x] `addHost` — ไม่มี active profile → ไม่ auto-add
- [x] `updateHost` — patch บาง field
- [x] `deleteHost` — ลบออกจาก `hosts[]`
- [x] `deleteHost` — cascade ลบจาก profile `entryIds`
- [x] `enableAllHosts` / `disableAllHosts`
- [x] `toggleGroupHosts` — enable/disable per-group
- [x] `toggleGroupHosts` — ไม่กระทบ hosts ใน group อื่น

### 3.3 — groupsSlice.test.ts

- [x] `tests/unit/store/slices/groupsSlice.test.ts`
- [x] `addGroup` — เพิ่ม group + auto-add ไปยัง active profile `groupIds`
- [x] `deleteGroup(id, true)` — ลบ hosts ออกจาก `hosts[]`
- [x] `deleteGroup(id, true)` — cascade ลบจาก profile `entryIds`
- [x] `deleteGroup(id, true)` — cascade ลบจาก profile `groupIds`
- [x] `deleteGroup(id, false)` — unassign hosts (`groupId = undefined`)
- [x] `deleteGroup(id, false)` — cascade ลบจาก profile `groupIds` เท่านั้น
- [x] `deleteGroup(id, false)` — host IDs ยังอยู่ใน profile `entryIds`

### 3.4 — profilesSlice.test.ts

- [x] `tests/unit/store/slices/profilesSlice.test.ts`
- [x] `activateProfile` — profile ที่ activate → `active=true`
- [x] `activateProfile` — profiles อื่นทุกตัว → `active=false` (exactly-1 invariant)
- [x] `activateProfile` — activate ซ้ำ → ยัง active
- [x] `duplicateProfile` — ชื่อ "Copy of {name}"
- [x] `duplicateProfile` — deep copy `entryIds` + `groupIds`
- [x] `deleteProfile` — ลบออกจาก store

### 3.5 — backupsSlice.test.ts

- [x] `tests/unit/store/slices/backupsSlice.test.ts`
- [x] Auto-cleanup: count ≤ limit → ไม่ prune
- [x] Auto-cleanup: count > limit → prune oldest
- [x] Auto-cleanup: `autoCleanupBackups=false` → ไม่ prune แม้เกิน limit

### 3.6 — importSlice.test.ts

- [x] `tests/unit/store/slices/importSlice.test.ts`
- [x] import hosts ใหม่ → เข้า store
- [x] strategy `skip` — domain ซ้ำ → ข้าม
- [x] strategy `overwrite` — domain ซ้ำ → แทนที่
- [x] strategy `duplicate` — domain ซ้ำ → เพิ่มทั้งคู่
- [x] `addToActiveProfile=true` → hosts ถูก add เข้า active profile
- [x] parse raw hosts text: `127.0.0.1  web.local` → HostEntry ถูกต้อง
- [x] comment lines (`#`) → skip

### 3.7 — notificationsSlice.test.ts

- [x] `tests/unit/store/slices/notificationsSlice.test.ts`
- [x] `addNotification` → `unread=true`
- [x] max 50 ring buffer → เมื่อเกิน ลบ oldest
- [x] `markAllNotificationsAsRead` → ทุก `unread=false`
- [x] `clearNotifications` → array ว่าง

**วิธีรัน:**
```bash
pnpm test              # run once
pnpm test:watch        # watch mode
pnpm test:coverage     # with coverage report
```

---

## Milestone 4 — E2E Tests (Playwright + Tauri Mode)

### 4.1 — Playwright Config & Global Setup

- [x] `tests/e2e/playwright.config.ts`
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  retries: 1,
  globalSetup: './global-setup.ts',
  globalTeardown: './global-setup.ts',
})
```

- [x] `tests/e2e/global-setup.ts`

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'

let tauriProcess: ChildProcess

export default async function globalSetup() {
  // 1. สร้าง temp directories
  const testDataDir = mkdtempSync(join(tmpdir(), 'hostpilot-test-data-'))
  const testHostsPath = join(tmpdir(), `hostpilot-test-hosts-${Date.now()}`)

  // 2. สร้าง temp hosts file เปล่า
  writeFileSync(testHostsPath, '# HostPilot Test Hosts File\n127.0.0.1 localhost\n')

  // 3. set env vars
  process.env.HOSTPILOT_TEST_DATA_DIR = testDataDir
  process.env.HOSTPILOT_TEST_HOSTS_PATH = testHostsPath
  process.env.HOSTPILOT_TEST_DATA_DIR_PATH = testDataDir  // สำหรับ teardown

  // 4. launch Tauri debug binary (ต้อง build ก่อน ด้วย pnpm build:e2e)
  const binaryPath = 'src-tauri/target/debug/hostpilot'
  tauriProcess = spawn(binaryPath, [], {
    env: { ...process.env },
  })

  // 5. รอ WebSocket bridge พร้อม
  await waitForWsBridge()
}

export async function globalTeardown() {
  tauriProcess?.kill()
  if (process.env.HOSTPILOT_TEST_DATA_DIR_PATH) {
    rmSync(process.env.HOSTPILOT_TEST_DATA_DIR_PATH, { recursive: true, force: true })
  }
  if (process.env.HOSTPILOT_TEST_HOSTS_PATH) {
    rmSync(process.env.HOSTPILOT_TEST_HOSTS_PATH, { force: true })
  }
}
```

### 4.2 — `data-testid` Attributes ที่ต้องเพิ่มใน Source

> เพิ่มใน production HTML elements แต่ไม่ส่งผลต่อ behavior

| ไฟล์ | Attribute |
|---|---|
| `src/pages/HostsPage.tsx` | `data-testid="add-host-btn"`, `"host-row-{id}"`, `"host-toggle-{id}"`, `"host-delete-{id}"`, `"host-search"` |
| `src/pages/ProfilesPage.tsx` | `data-testid="add-profile-btn"`, `"profile-card-{id}"`, `"activate-profile-{id}"`, `"active-profile-banner"` |
| `src/pages/GroupsPage.tsx` | `data-testid="add-group-btn"`, `"group-card-{id}"`, `"delete-group-{id}"` |
| `src/components/layout/Sidebar.tsx` | `data-testid="nav-link-{page}"` |
| `src/components/hosts/HostFormDialog.tsx` | `data-testid="host-form-domain"`, `"host-form-ip"`, `"host-form-submit"` |

### 4.3 — E2E Test Specs

- [x] `tests/e2e/specs/navigation.spec.ts` (~6 tests)
  - ✦ ทุกหน้า (Hosts, Groups, Profiles, Ports, Backups, Settings) โหลดได้
  - ✦ Sidebar มีลิงก์ครบ

- [x] `tests/e2e/specs/hosts.spec.ts` (~6 tests)
  - ✦ เพิ่ม host ใหม่ → ปรากฏในตาราง
  - ✦ toggle enabled → state เปลี่ยน
  - ✦ search → filter ผลลัพธ์
  - ✦ edit host → ข้อมูลอัปเดต
  - ✦ delete host → ออกจากตาราง
  - ✦ Apply Changes → เขียนไปยัง `HOSTPILOT_TEST_HOSTS_PATH` + verify content

- [x] `tests/e2e/specs/profiles.spec.ts` (~4 tests)
  - ✦ สร้าง profile → ปรากฏใน grid
  - ✦ activate profile → active banner แสดง
  - ✦ duplicate profile → "Copy of {name}" ปรากฏ
  - ✦ delete profile → ออกจาก grid

- [x] `tests/e2e/specs/groups.spec.ts` (~3 tests)
  - ✦ สร้าง group → card ปรากฏ
  - ✦ edit group → ชื่ออัปเดต
  - ✦ delete group (ไม่ลบ hosts) → group หาย, hosts ยังอยู่

- [x] `tests/e2e/specs/import.spec.ts` (~2 tests)
  - ✦ paste raw hosts text → parse preview แสดง count ถูกต้อง
  - ✦ export tab โหลดและแสดง JSON preview

**วิธีรัน:**
```bash
# build ก่อน (ครั้งแรก หรือเมื่อ Rust เปลี่ยน)
pnpm build:e2e

# รัน E2E
pnpm test:e2e

# รัน spec เดียว
pnpm test:e2e -- --grep "hosts"
```

---

## Milestone 5 — GitHub Actions CI/CD

### 5.1 — Fast Tests (Unit) — ทุก push

- [x] `.github/workflows/test-unit.yml`

```yaml
name: Unit Tests

on:
  push:
    branches: ['**']
  pull_request:

jobs:
  rust-unit:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri
      - name: Run Rust unit tests
        run: cd src-tauri && cargo test

  frontend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - name: Run Vitest
        run: pnpm test
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()
```

> ⏱ เวลาโดยประมาณ: **~2-3 นาที** (Rust cached ~1m, Vitest ~15s)

### 5.2 — E2E Tests — PR to main เท่านั้น

- [x] `.github/workflows/test-e2e.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  workflow_dispatch:   # สามารถ trigger manual ได้

jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium
      - name: Build Tauri debug binary (e2e-testing feature)
        run: pnpm build:e2e
      - name: Run E2E tests
        run: pnpm test:e2e
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

> ⏱ เวลาโดยประมาณ:
> - ครั้งแรก (cold cache): **~15-20 นาที** (Rust build นาน)
> - ครั้งต่อไป (warm cache): **~5-8 นาที**

---

## สรุป Run Commands ทั้งหมด

```bash
# ─── Rust Unit Tests ─────────────────────────────────────
cd src-tauri && cargo test

# ─── Frontend Unit Tests ─────────────────────────────────
pnpm test                  # run once
pnpm test:watch            # watch mode
pnpm test:coverage         # with coverage

# ─── E2E Tests ───────────────────────────────────────────
pnpm build:e2e             # build Tauri debug binary (ต้องรันก่อน E2E)
pnpm test:e2e              # run all E2E tests
pnpm test:e2e -- --grep "hosts"   # run specific spec

# ─── Run All (CI equivalent) ─────────────────────────────
cd src-tauri && cargo test && cd .. && pnpm test && pnpm test:e2e
```

---

## DB ที่ใช้แต่ละ Layer

| Layer | Database | Path | จัดการโดย |
|---|---|---|---|
| Rust Unit Tests | SQLite `:memory:` | RAM | `create_test_db()` helper |
| Frontend Unit (Vitest) | ไม่มี | — | mock apiAdapter |
| E2E (Tauri mode) | SQLite file | `/tmp/hostpilot-test-data-{hash}/hostpilot.db` | global-setup.ts |
| E2E hosts file | temp text file | `/tmp/hostpilot-test-hosts-{ts}` | global-setup.ts |
| Production | SQLite file | `~/Library/Application Support/.../hostpilot.db` | ไม่ยุ่งเลย ✅ |

---

## Progress Tracker

| Milestone | Status |
|---|---|
| M1.1 — ติดตั้ง Frontend deps | ✅ |
| M1.2 — Rust Feature Flag | ✅ |
| M1.3 — DB + Hosts Path isolation | ✅ |
| M1.4 — `pub(crate)` functions | ✅ |
| M2.1 — hosts_tests.rs | ✅ |
| M2.2 — db_tests.rs | ✅ |
| M2.3 — config_tests.rs | ✅ |
| M3.1 — types.test.ts | ✅ |
| M3.2 — hostsSlice.test.ts | ✅ |
| M3.3 — groupsSlice.test.ts | ✅ |
| M3.4 — profilesSlice.test.ts | ✅ |
| M3.5 — backupsSlice.test.ts | ✅ |
| M3.6 — importSlice.test.ts | ✅ |
| M3.7 — notificationsSlice.test.ts | ✅ |
| M4.1 — Playwright config + global-setup | ✅ |
| M4.2 — data-testid attributes | ✅ |
| M4.3 — E2E specs (5 files) | ✅ |
| M5.1 — test-unit.yml | ✅ |
| M5.2 — test-e2e.yml | ✅ |
