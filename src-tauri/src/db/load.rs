use crate::config::*;
use super::get_connection;

// Load queries at compile-time from external SQL files
const QUERY_SELECT_GROUPS: &str = include_str!("../../queries/select_groups.sql");
const QUERY_SELECT_HOSTS: &str = include_str!("../../queries/select_hosts.sql");
const QUERY_SELECT_PROFILES: &str = include_str!("../../queries/select_profiles.sql");
const QUERY_SELECT_PROFILE_ENTRIES: &str = include_str!("../../queries/select_profile_entries.sql");
const QUERY_SELECT_PROFILE_GROUPS: &str = include_str!("../../queries/select_profile_groups.sql");
const QUERY_SELECT_PORTS: &str = include_str!("../../queries/select_ports.sql");
const QUERY_SELECT_BACKUPS: &str = include_str!("../../queries/select_backups.sql");
const QUERY_SELECT_APP_STATE_ONBOARDED: &str = include_str!("../../queries/select_app_state_onboarded.sql");
const QUERY_SELECT_APP_STATE_SETTINGS: &str = include_str!("../../queries/select_app_state_settings.sql");
const QUERY_SELECT_APP_STATE_NOTIFICATIONS: &str = include_str!("../../queries/select_app_state_notifications.sql");
const QUERY_SELECT_PROXY_RULES: &str = include_str!("../../queries/select_proxy_rules.sql");

pub fn load_config_from_db(app_handle: &tauri::AppHandle) -> Result<AppConfig, String> {
    let conn = get_connection(app_handle)?;
    
    // 1. Load groups
    let mut stmt = conn.prepare(QUERY_SELECT_GROUPS)
        .map_err(|e| e.to_string())?;
    let groups_iter = stmt.query_map([], |row| {
        Ok(HostGroup {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            color: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut groups = Vec::new();
    for g in groups_iter {
        groups.push(g.map_err(|e| e.to_string())?);
    }
    
    // 2. Load hosts
    let mut stmt = conn.prepare(QUERY_SELECT_HOSTS)
        .map_err(|e| e.to_string())?;
    let hosts_iter = stmt.query_map([], |row| {
        let enabled_val: i32 = row.get(3)?;
        let is_dynamic_val: i32 = row.get(9).unwrap_or(0);
        Ok(HostEntry {
            id: row.get(0)?,
            domain: row.get(1)?,
            ip: row.get(2)?,
            enabled: enabled_val != 0,
            group_id: row.get(4)?,
            description: row.get(5)?,
            source: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            is_dynamic: is_dynamic_val != 0,
            dynamic_type: row.get(10).ok(),
            dynamic_value: row.get(11).ok(),
            last_synced: row.get(12).ok(),
            sync_interval: row.get(13).ok(),
        })
    }).map_err(|e| e.to_string())?;
    let mut hosts = Vec::new();
    for h in hosts_iter {
        hosts.push(h.map_err(|e| e.to_string())?);
    }
    
    // 3. Load profiles
    let mut stmt = conn.prepare(QUERY_SELECT_PROFILES)
        .map_err(|e| e.to_string())?;
    let profiles_iter = stmt.query_map([], |row| {
        let active_val: i32 = row.get(3)?;
        let favorite_val: i32 = row.get(4)?;
        let id: String = row.get(0)?;
        Ok((id, row.get::<_, String>(1)?, row.get::<_, Option<String>>(2)?, active_val != 0, favorite_val != 0, row.get::<_, String>(5)?, row.get::<_, String>(6)?))
    }).map_err(|e| e.to_string())?;
    
    let mut profiles = Vec::new();
    for p in profiles_iter {
        let (id, name, description, active, favorite, created_at, updated_at) = p.map_err(|e| e.to_string())?;
        
        let mut entry_stmt = conn.prepare(QUERY_SELECT_PROFILE_ENTRIES)
            .map_err(|e| e.to_string())?;
        let entries_iter = entry_stmt.query_map([&id], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        let mut entry_ids = Vec::new();
        for ent in entries_iter {
            entry_ids.push(ent.map_err(|e| e.to_string())?);
        }

        let mut group_stmt = conn.prepare(QUERY_SELECT_PROFILE_GROUPS)
            .map_err(|e| e.to_string())?;
        let groups_iter = group_stmt.query_map([&id], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        let mut group_ids = Vec::new();
        for gid in groups_iter {
            group_ids.push(gid.map_err(|e| e.to_string())?);
        }
        
        profiles.push(HostProfile {
            id,
            name,
            description,
            entry_ids,
            group_ids,
            active,
            favorite,
            created_at,
            updated_at,
        });
    }
    
    // 4. Load ports
    let mut stmt = conn.prepare(QUERY_SELECT_PORTS)
        .map_err(|e| e.to_string())?;
    let ports_iter = stmt.query_map([], |row| {
        let port_val: i32 = row.get(3)?;
        let enabled_val: i32 = row.get(5)?;
        Ok(PortRule {
            id: row.get(0)?,
            domain: row.get(1)?,
            target_host: row.get(2)?,
            port: port_val as u16,
            protocol: row.get(4)?,
            enabled: enabled_val != 0,
            status: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut ports = Vec::new();
    for p in ports_iter {
        ports.push(p.map_err(|e| e.to_string())?);
    }
    
    // 5. Load backups
    let mut stmt = conn.prepare(QUERY_SELECT_BACKUPS)
        .map_err(|e| e.to_string())?;
    let backups_iter = stmt.query_map([], |row| {
        Ok(BackupRecord {
            id: row.get(0)?,
            created_at: row.get(1)?,
            reason: row.get(2)?,
            size: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut backups = Vec::new();
    for b in backups_iter {
        backups.push(b.map_err(|e| e.to_string())?);
    }
    
    // 6. Load app state
    let mut stmt = conn.prepare(QUERY_SELECT_APP_STATE_ONBOARDED)
        .map_err(|e| e.to_string())?;
    let onboarded = match stmt.query_row([], |row| row.get::<_, String>(0)) {
        Ok(val) => val == "true",
        Err(rusqlite::Error::QueryReturnedNoRows) => false,
        Err(e) => return Err(e.to_string()),
    };

    let mut stmt = conn.prepare(QUERY_SELECT_APP_STATE_SETTINGS)
        .map_err(|e| e.to_string())?;
    let settings = match stmt.query_row([], |row| row.get::<_, String>(0)) {
        Ok(val) => serde_json::from_str::<crate::config::AppSettings>(&val).ok(),
        Err(rusqlite::Error::QueryReturnedNoRows) => None,
        Err(e) => return Err(e.to_string()),
    };

    let mut stmt = conn.prepare(QUERY_SELECT_APP_STATE_NOTIFICATIONS)
        .map_err(|e| e.to_string())?;
    let notifications = match stmt.query_row([], |row| row.get::<_, String>(0)) {
        Ok(val) => serde_json::from_str::<Vec<crate::config::AppNotification>>(&val).unwrap_or_default(),
        Err(rusqlite::Error::QueryReturnedNoRows) => Vec::new(),
        Err(e) => return Err(e.to_string()),
    };
    
    // 7. Load proxy rules
    let mut stmt = conn.prepare(QUERY_SELECT_PROXY_RULES)
        .map_err(|e| e.to_string())?;
    let proxy_rules_iter = stmt.query_map([], |row| {
        let enabled_val: i32 = row.get(6)?;
        let strip_prefix_val: i32 = row.get(7)?;
        let is_regex_val: i32 = row.get(8)?;
        Ok(ProxyRule {
            id: row.get(0)?,
            domain: row.get(1)?,
            path_prefix: row.get(2)?,
            target_type: row.get(3)?,
            target_address: row.get(4)?,
            custom_resolver: row.get(5)?,
            enabled: enabled_val != 0,
            strip_prefix: strip_prefix_val != 0,
            is_regex: is_regex_val != 0,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut proxy_rules = Vec::new();
    for r in proxy_rules_iter {
        proxy_rules.push(r.map_err(|e| e.to_string())?);
    }
    
    Ok(AppConfig {
        hosts,
        groups,
        profiles,
        ports,
        backups,
        onboarded,
        settings,
        notifications,
        proxy_rules,
    })
}
