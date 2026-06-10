use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostEntry {
    pub id: String,
    pub domain: String,
    pub ip: String,
    pub enabled: bool,
    pub group_id: Option<String>,
    pub description: Option<String>,
    pub source: String, // "manual" | "imported" | "project-file"
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
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub active: bool,
    pub last_activated_at: String,
    pub entry_count: u32,
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
    pub projects: Vec<Project>,
    pub backups: Vec<BackupRecord>,
    #[serde(default)]
    pub onboarded: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        // We will seed the configuration with some clean mock data to start with.
        AppConfig {
            hosts: vec![],
            groups: vec![],
            profiles: vec![],
            ports: vec![],
            projects: vec![],
            backups: vec![],
            onboarded: false,
        }
    }
}

/// Returns the configuration file path in the app data directory
pub fn get_config_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_dir.join("config.json"))
}

/// Loads app configuration from disk or seeds the defaults if missing.
pub fn load_config(app_handle: &tauri::AppHandle) -> Result<AppConfig, String> {
    let config_path = get_config_path(app_handle)?;
    if !config_path.exists() {
        // Create the app directory if it doesn't exist
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }
        let default_config = get_initial_seed();
        save_config(app_handle, &default_config)?;
        return Ok(default_config);
    }

    let file_content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    
    let config: AppConfig = serde_json::from_str(&file_content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;
        
    Ok(config)
}

/// Saves the app configuration to disk.
pub fn save_config(app_handle: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let config_path = get_config_path(app_handle)?;
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    let serialized = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
        
    fs::write(&config_path, serialized)
        .map_err(|e| format!("Failed to write config file: {}", e))?;
        
    Ok(())
}

fn get_initial_seed() -> AppConfig {
    // Clean seed data, starting with empty lists
    AppConfig {
        groups: vec![],
        hosts: vec![],
        profiles: vec![],
        ports: vec![],
        projects: vec![],
        backups: vec![],
        onboarded: false,
    }
}
