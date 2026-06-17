-- Add strip_prefix and is_regex columns to proxy_rules table
ALTER TABLE proxy_rules ADD COLUMN strip_prefix INTEGER NOT NULL DEFAULT 0;
ALTER TABLE proxy_rules ADD COLUMN is_regex INTEGER NOT NULL DEFAULT 0;
