-- Migration: Add dynamic host columns to hosts table
ALTER TABLE hosts ADD COLUMN is_dynamic INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hosts ADD COLUMN dynamic_type TEXT;
ALTER TABLE hosts ADD COLUMN dynamic_value TEXT;
ALTER TABLE hosts ADD COLUMN last_synced TEXT;
ALTER TABLE hosts ADD COLUMN sync_interval INTEGER;
