mod load;
mod save;

pub use load::load_config_from_db;
pub use save::save_config_to_db;

use tauri::Manager;
use rusqlite::Connection;

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
        include_str!("../../migrations/0001_init.sql"),
        include_str!("../../migrations/0002_proxy.sql"),
        include_str!("../../migrations/0003_proxy_advanced.sql"),
        include_str!("../../migrations/0004_dynamic_hosts.sql"),
        include_str!("../../migrations/0005_profile_groups.sql"),
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
