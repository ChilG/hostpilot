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
    #[serde(default)]
    pub is_dynamic: bool,
    pub dynamic_type: Option<String>,
    pub dynamic_value: Option<String>,
    pub last_synced: Option<String>,
    pub sync_interval: Option<i32>,
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
pub struct AppSettings {
    pub hosts_path: String,
    pub preview_before_apply: bool,
    pub backup_before_write: bool,
    pub validate_before_write: bool,
    pub backup_directory: String,
    pub keep_backups_count: i32,
    pub auto_cleanup_backups: bool,
    pub show_apply_notifications: bool,
    pub show_error_alerts: bool,
    pub port_status_alerts: bool,
    pub color_theme: String,
    pub language: String,
    #[serde(default)]
    pub ssl_enabled: bool,
    #[serde(default = "default_ssl_port")]
    pub ssl_port: u16,
}

fn default_ssl_port() -> u16 {
    443
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppNotification {
    pub id: String,
    pub title: String,
    pub description: String,
    pub r#type: String, // "info" | "success" | "warning" | "error"
    pub timestamp: String,
    pub unread: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyRule {
    pub id: String,
    pub domain: String,
    pub path_prefix: String,
    pub target_type: String, // "local" | "external"
    pub target_address: String,
    pub custom_resolver: Option<String>,
    pub enabled: bool,
    #[serde(default)]
    pub strip_prefix: bool,
    #[serde(default)]
    pub is_regex: bool,
    pub created_at: String,
    pub updated_at: String,
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
    pub settings: Option<AppSettings>,
    #[serde(default)]
    pub notifications: Vec<AppNotification>,
    #[serde(default)]
    pub proxy_rules: Vec<ProxyRule>,
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
            settings: None,
            notifications: vec![],
            proxy_rules: vec![],
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
