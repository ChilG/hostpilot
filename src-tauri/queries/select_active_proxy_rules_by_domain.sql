SELECT id, domain, path_prefix, target_type, target_address, custom_resolver, enabled, strip_prefix, is_regex, created_at, updated_at
FROM proxy_rules
WHERE domain = ?1 AND enabled = 1
ORDER BY is_regex ASC, length(path_prefix) DESC;
