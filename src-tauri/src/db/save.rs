use rusqlite::params;
use crate::config::*;
use super::get_connection;

const QUERY_DELETE_ALL_PROFILE_ENTRIES: &str = include_str!("../../queries/delete_all_profile_entries.sql");
const QUERY_DELETE_ALL_PROFILES: &str = include_str!("../../queries/delete_all_profiles.sql");
const QUERY_DELETE_ALL_HOSTS: &str = include_str!("../../queries/delete_all_hosts.sql");
const QUERY_DELETE_ALL_GROUPS: &str = include_str!("../../queries/delete_all_groups.sql");
const QUERY_DELETE_ALL_PORTS: &str = include_str!("../../queries/delete_all_ports.sql");
const QUERY_DELETE_ALL_BACKUPS: &str = include_str!("../../queries/delete_all_backups.sql");
const QUERY_DELETE_ALL_APP_STATE: &str = include_str!("../../queries/delete_all_app_state.sql");
const QUERY_DELETE_ALL_PROXY_RULES: &str = include_str!("../../queries/delete_all_proxy_rules.sql");

const QUERY_INSERT_GROUP: &str = include_str!("../../queries/insert_group.sql");
const QUERY_INSERT_HOST: &str = include_str!("../../queries/insert_host.sql");
const QUERY_INSERT_PROFILE: &str = include_str!("../../queries/insert_profile.sql");
const QUERY_CHECK_HOST_EXISTS: &str = include_str!("../../queries/check_host_exists.sql");
const QUERY_INSERT_PROFILE_ENTRY: &str = include_str!("../../queries/insert_profile_entry.sql");
const QUERY_INSERT_PORT: &str = include_str!("../../queries/insert_port.sql");
const QUERY_INSERT_BACKUP: &str = include_str!("../../queries/insert_backup.sql");
const QUERY_INSERT_APP_STATE: &str = include_str!("../../queries/insert_app_state.sql");
const QUERY_INSERT_PROXY_RULE: &str = include_str!("../../queries/insert_proxy_rule.sql");

pub fn save_config_to_db(app_handle: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let mut conn = get_connection(app_handle)?;
    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    tx.execute(QUERY_DELETE_ALL_PROFILE_ENTRIES, []).map_err(|e| e.to_string())?;
    tx.execute(QUERY_DELETE_ALL_PROFILES, []).map_err(|e| e.to_string())?;
    tx.execute(QUERY_DELETE_ALL_HOSTS, []).map_err(|e| e.to_string())?;
    tx.execute(QUERY_DELETE_ALL_GROUPS, []).map_err(|e| e.to_string())?;
    tx.execute(QUERY_DELETE_ALL_PORTS, []).map_err(|e| e.to_string())?;
    tx.execute(QUERY_DELETE_ALL_BACKUPS, []).map_err(|e| e.to_string())?;
    tx.execute(QUERY_DELETE_ALL_APP_STATE, []).map_err(|e| e.to_string())?;
    tx.execute(QUERY_DELETE_ALL_PROXY_RULES, []).map_err(|e| e.to_string())?;
    
    for g in &config.groups {
        tx.execute(
            QUERY_INSERT_GROUP,
            params![g.id, g.name, g.description, g.color],
        ).map_err(|e| format!("Failed to insert group: {}", e))?;
    }
    
    for h in &config.hosts {
        tx.execute(
            QUERY_INSERT_HOST,
            params![
                h.id,
                h.domain,
                h.ip,
                if h.enabled { 1 } else { 0 },
                h.group_id,
                h.description,
                h.source,
                h.created_at,
                h.updated_at,
                if h.is_dynamic { 1 } else { 0 },
                h.dynamic_type,
                h.dynamic_value,
                h.last_synced,
                h.sync_interval
            ],
        ).map_err(|e| format!("Failed to insert host: {}", e))?;
    }
    
    for p in &config.profiles {
        tx.execute(
            QUERY_INSERT_PROFILE,
            params![
                p.id,
                p.name,
                p.description,
                if p.active { 1 } else { 0 },
                if p.favorite { 1 } else { 0 },
                p.created_at,
                p.updated_at
            ],
        ).map_err(|e| format!("Failed to insert profile: {}", e))?;
        
        for host_id in &p.entry_ids {
            let exists: bool = tx.query_row(
                QUERY_CHECK_HOST_EXISTS,
                params![host_id],
                |row| row.get(0),
            ).unwrap_or(false);
            
            if exists {
                tx.execute(
                    QUERY_INSERT_PROFILE_ENTRY,
                    params![p.id, host_id],
                ).map_err(|e| format!("Failed to insert profile entry: {}", e))?;
            }
        }
    }
    
    for p in &config.ports {
        tx.execute(
            QUERY_INSERT_PORT,
            params![
                p.id,
                p.domain,
                p.target_host,
                p.port as i32,
                p.protocol,
                if p.enabled { 1 } else { 0 },
                p.status
            ],
        ).map_err(|e| format!("Failed to insert port: {}", e))?;
    }
    
    for b in &config.backups {
        tx.execute(
            QUERY_INSERT_BACKUP,
            params![b.id, b.created_at, b.reason, b.size],
        ).map_err(|e| format!("Failed to insert backup: {}", e))?;
    }

    for r in &config.proxy_rules {
        tx.execute(
            QUERY_INSERT_PROXY_RULE,
            params![
                r.id,
                r.domain,
                r.path_prefix,
                r.target_type,
                r.target_address,
                r.custom_resolver,
                if r.enabled { 1 } else { 0 },
                if r.strip_prefix { 1 } else { 0 },
                if r.is_regex { 1 } else { 0 },
                r.created_at,
                r.updated_at
            ],
        ).map_err(|e| format!("Failed to insert proxy rule: {}", e))?;
    }
    
    tx.execute(
        QUERY_INSERT_APP_STATE,
        params!["onboarded", if config.onboarded { "true" } else { "false" }],
    ).map_err(|e| format!("Failed to insert app state: {}", e))?;

    if let Some(ref settings) = config.settings {
        if let Ok(settings_json) = serde_json::to_string(settings) {
            tx.execute(
                QUERY_INSERT_APP_STATE,
                params!["settings", settings_json],
            ).map_err(|e| format!("Failed to insert settings: {}", e))?;
        }
    }

    if let Ok(notifications_json) = serde_json::to_string(&config.notifications) {
        tx.execute(
            QUERY_INSERT_APP_STATE,
            params!["notifications", notifications_json],
        ).map_err(|e| format!("Failed to insert notifications: {}", e))?;
    }
    
    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    Ok(())
}
