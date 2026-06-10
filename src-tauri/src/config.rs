use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostEntry {
    pub id: String,
    pub domain: String,
    pub ip: String,
    pub enabled: bool,
    pub group_id: Option<String>,
    pub description: Option<String>,
    pub source: String, // "manual" | "imported"
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostGroup {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostProfile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub entry_ids: Vec<String>,
    pub active: bool,
    pub favorite: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortRule {
    pub id: String,
    pub domain: String,
    pub target_host: String,
    pub port: u16,
    pub protocol: String, // "http" | "https"
    pub enabled: bool,
    pub status: String, // "running" | "stopped" | "unknown"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRecord {
    pub id: String,
    pub created_at: String,
    pub reason: String,
    pub size: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub hosts: Vec<HostEntry>,
    pub groups: Vec<HostGroup>,
    pub profiles: Vec<HostProfile>,
    pub ports: Vec<PortRule>,
    pub backups: Vec<BackupRecord>,
    #[serde(default)]
    pub onboarded: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            hosts: vec![],
            groups: vec![],
            profiles: vec![],
            ports: vec![],
            backups: vec![],
            onboarded: false,
        }
    }
}

/// Loads app configuration from SQLite database, initializing tables if missing.
pub fn load_config(app_handle: &tauri::AppHandle) -> Result<AppConfig, String> {
    // Ensure database and schema are initialized
    crate::db::init_db(app_handle)?;
    
    // Load config from database
    crate::db::load_config_from_db(app_handle)
}

/// Saves the app configuration to SQLite database.
pub fn save_config(app_handle: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    crate::db::save_config_to_db(app_handle, config)
}
