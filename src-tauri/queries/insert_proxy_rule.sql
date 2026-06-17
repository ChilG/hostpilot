INSERT OR REPLACE INTO proxy_rules (id, domain, path_prefix, target_type, target_address, custom_resolver, enabled, strip_prefix, is_regex, created_at, updated_at)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11);

