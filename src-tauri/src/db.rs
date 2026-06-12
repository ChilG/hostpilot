use tauri::Manager;
use rusqlite::{Connection, params};
use crate::config::{AppConfig, HostEntry, HostGroup, HostProfile, PortRule, BackupRecord};

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
    let conn = get_connection(app_handle)?;
    
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS groups (
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
        );"
    ).map_err(|e| format!("Failed to initialize database tables: {}", e))?;
    
    Ok(())
}

pub fn load_config_from_db(app_handle: &tauri::AppHandle) -> Result<AppConfig, String> {
    let conn = get_connection(app_handle)?;
    
    // 1. Load groups
    let mut stmt = conn.prepare("SELECT id, name, description, color FROM groups")
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
    let mut stmt = conn.prepare("SELECT id, domain, ip, enabled, group_id, description, source, created_at, updated_at FROM hosts")
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
    let mut stmt = conn.prepare("SELECT id, name, description, active, favorite, created_at, updated_at FROM profiles")
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
        
        let mut entry_stmt = conn.prepare("SELECT host_id FROM profile_entries WHERE profile_id = ?")
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
    let mut stmt = conn.prepare("SELECT id, domain, target_host, port, protocol, enabled, status FROM ports")
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
    let mut stmt = conn.prepare("SELECT id, created_at, reason, size FROM backups")
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
    let mut stmt = conn.prepare("SELECT value FROM app_state WHERE key = 'onboarded'")
        .map_err(|e| e.to_string())?;
    let onboarded = match stmt.query_row([], |row| row.get::<_, String>(0)) {
        Ok(val) => val == "true",
        Err(rusqlite::Error::QueryReturnedNoRows) => false,
        Err(e) => return Err(e.to_string()),
    };

    let mut stmt = conn.prepare("SELECT value FROM app_state WHERE key = 'settings'")
        .map_err(|e| e.to_string())?;
    let settings = match stmt.query_row([], |row| row.get::<_, String>(0)) {
        Ok(val) => serde_json::from_str::<crate::config::AppSettings>(&val).ok(),
        Err(rusqlite::Error::QueryReturnedNoRows) => None,
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
    })
}

pub fn save_config_to_db(app_handle: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let mut conn = get_connection(app_handle)?;
    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;
    
    tx.execute("DELETE FROM profile_entries", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM profiles", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM hosts", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM groups", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM ports", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM backups", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM app_state", []).map_err(|e| e.to_string())?;
    
    for g in &config.groups {
        tx.execute(
            "INSERT INTO groups (id, name, description, color) VALUES (?, ?, ?, ?)",
            params![g.id, g.name, g.description, g.color],
        ).map_err(|e| format!("Failed to insert group: {}", e))?;
    }
    
    for h in &config.hosts {
        tx.execute(
            "INSERT INTO hosts (id, domain, ip, enabled, group_id, description, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
            "INSERT INTO profiles (id, name, description, active, favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
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
                "SELECT EXISTS(SELECT 1 FROM hosts WHERE id = ?)",
                params![host_id],
                |row| row.get(0),
            ).unwrap_or(false);
            
            if exists {
                tx.execute(
                    "INSERT INTO profile_entries (profile_id, host_id) VALUES (?, ?)",
                    params![p.id, host_id],
                ).map_err(|e| format!("Failed to insert profile entry: {}", e))?;
            }
        }
    }
    
    for p in &config.ports {
        tx.execute(
            "INSERT INTO ports (id, domain, target_host, port, protocol, enabled, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
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
            "INSERT INTO backups (id, created_at, reason, size) VALUES (?, ?, ?, ?)",
            params![b.id, b.created_at, b.reason, b.size],
        ).map_err(|e| format!("Failed to insert backup: {}", e))?;
    }
    
    tx.execute(
        "INSERT INTO app_state (key, value) VALUES ('onboarded', ?)",
        params![if config.onboarded { "true" } else { "false" }],
    ).map_err(|e| format!("Failed to insert app state: {}", e))?;

    if let Some(ref settings) = config.settings {
        if let Ok(settings_json) = serde_json::to_string(settings) {
            tx.execute(
                "INSERT INTO app_state (key, value) VALUES ('settings', ?)",
                params![settings_json],
            ).map_err(|e| format!("Failed to insert settings: {}", e))?;
        }
    }
    
    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    Ok(())
}
