CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hosts (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    ip TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 0,
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_entries (
    profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    host_id TEXT REFERENCES hosts(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, host_id)
);

CREATE TABLE IF NOT EXISTS ports (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    target_host TEXT NOT NULL DEFAULT '127.0.0.1',
    port INTEGER NOT NULL,
    protocol TEXT NOT NULL DEFAULT 'http',
    enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'unknown'
);

CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    reason TEXT NOT NULL,
    size TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
