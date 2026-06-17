CREATE TABLE IF NOT EXISTS proxy_rules (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    path_prefix TEXT NOT NULL,
    target_type TEXT NOT NULL,          -- 'local' | 'external'
    target_address TEXT NOT NULL,
    custom_resolver TEXT,               -- e.g., '8.8.8.8' or NULL
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(domain, path_prefix)
);
