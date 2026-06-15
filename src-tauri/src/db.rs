use tauri::Manager;
use rusqlite::{Connection, params};
use crate::config::{AppConfig, HostEntry, HostGroup, HostProfile, PortRule, BackupRecord};

// Load queries at compile-time from external SQL files
const QUERY_SELECT_GROUPS: &str = include_str!("../queries/select_groups.sql");
const QUERY_SELECT_HOSTS: &str = include_str!("../queries/select_hosts.sql");
const QUERY_SELECT_PROFILES: &str = include_str!("../queries/select_profiles.sql");
const QUERY_SELECT_PROFILE_ENTRIES: &str = include_str!("../queries/select_profile_entries.sql");
const QUERY_SELECT_PORTS: &str = include_str!("../queries/select_ports.sql");
const QUERY_SELECT_BACKUPS: &str = include_str!("../queries/select_backups.sql");
const QUERY_SELECT_APP_STATE_ONBOARDED: &str = include_str!("../queries/select_app_state_onboarded.sql");
const QUERY_SELECT_APP_STATE_SETTINGS: &str = include_str!("../queries/select_app_state_settings.sql");
const QUERY_SELECT_APP_STATE_NOTIFICATIONS: &str = include_str!("../queries/select_app_state_notifications.sql");

const QUERY_DELETE_ALL_PROFILE_ENTRIES: &str = include_str!("../queries/delete_all_profile_entries.sql");
const QUERY_DELETE_ALL_PROFILES: &str = include_str!("../queries/delete_all_profiles.sql");
const QUERY_DELETE_ALL_HOSTS: &str = include_str!("../queries/delete_all_hosts.sql");
const QUERY_DELETE_ALL_GROUPS: &str = include_str!("../queries/delete_all_groups.sql");
const QUERY_DELETE_ALL_PORTS: &str = include_str!("../queries/delete_all_ports.sql");
const QUERY_DELETE_ALL_BACKUPS: &str = include_str!("../queries/delete_all_backups.sql");
const QUERY_DELETE_ALL_APP_STATE: &str = include_str!("../queries/delete_all_app_state.sql");

const QUERY_INSERT_GROUP: &str = include_str!("../queries/insert_group.sql");
const QUERY_INSERT_HOST: &str = include_str!("../queries/insert_host.sql");
const QUERY_INSERT_PROFILE: &str = include_str!("../queries/insert_profile.sql");
const QUERY_CHECK_HOST_EXISTS: &str = include_str!("../queries/check_host_exists.sql");
const QUERY_INSERT_PROFILE_ENTRY: &str = include_str!("../queries/insert_profile_entry.sql");
const QUERY_INSERT_PORT: &str = include_str!("../queries/insert_port.sql");
const QUERY_INSERT_BACKUP: &str = include_str!("../queries/insert_backup.sql");
const QUERY_INSERT_APP_STATE: &str = include_str!("../queries/insert_app_state.sql");

pub fn get_db_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_dir.join("hostpilot.db"))
}

pub fn get_connection(app_handle: &tauri::AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app_handle)?;
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create db directory: {}", e))?;
    }
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    conn.execute("PRAGMA foreign_keys = ON;", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;
    Ok(conn)
}

pub fn init_db(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let mut conn = get_connection(app_handle)?;
    
    // Read current database version
    let current_version: i32 = conn.query_row("PRAGMA user_version;", [], |row| row.get(0))
        .map_err(|e| format!("Failed to read database schema version: {}", e))?;
    
    let migrations = [
        include_str!("../migrations/0001_init.sql"),
    ];
    
    for (i, migration_sql) in migrations.iter().enumerate() {
        let version = (i + 1) as i32;
        if current_version < version {
            let tx = conn.transaction().map_err(|e| format!("Failed to start migration transaction: {}", e))?;
            tx.execute_batch(migration_sql)
                .map_err(|e| format!("Failed to apply migration {}: {}", version, e))?;
            tx.commit().map_err(|e| format!("Failed to commit migration transaction: {}", e))?;
            
            conn.execute(&format!("PRAGMA user_version = {};", version), [])
                .map_err(|e| format!("Failed to update database schema version: {}", e))?;
        }
    }
    
    Ok(())
}

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
        
        profiles.push(HostProfile {
            id,
            name,
            description,
            entry_ids,
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
    
    Ok(AppConfig {
        hosts,
        groups,
        profiles,
        ports,
        backups,
        onboarded,
        settings,
        notifications,
    })
}

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
                h.updated_at
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
