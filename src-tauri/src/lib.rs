pub mod config;
pub mod db;
pub mod hosts;
mod ports;
mod proxy;
mod ssl;

use config::{AppConfig, BackupRecord, HostEntry};
use std::process::Command;

#[tauri::command]
async fn start_proxy_server(
    app_handle: tauri::AppHandle,
    port: u16,
    ssl_enabled: bool,
    ssl_port: u16,
) -> Result<(), String> {
    proxy::start_proxy(app_handle, port, ssl_enabled, ssl_port).await
}

#[tauri::command]
fn check_ca_status() -> bool {
    ssl::is_ca_trusted()
}

#[tauri::command]
fn install_root_ca(app_handle: tauri::AppHandle) -> Result<(), String> {
    ssl::install_root_ca(&app_handle)
}

#[tauri::command]
fn stop_proxy_server(app_handle: tauri::AppHandle) -> Result<(), String> {
    proxy::stop_proxy(app_handle)
}

#[tauri::command]
fn get_proxy_status(app_handle: tauri::AppHandle) -> Result<Option<u16>, String> {
    use tauri::Manager;
    let state = app_handle.state::<proxy::ProxyState>();
    let port_lock = state.running_port.lock().unwrap();
    Ok(*port_lock)
}

#[tauri::command]
fn close_splashscreen(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    if let Some(splashscreen) = app_handle.get_webview_window("splashscreen") {
        let _ = splashscreen.close();
    }
    if let Some(main) = app_handle.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn read_hosts_file() -> Result<String, String> {
    hosts::read_hosts_file()
}

#[tauri::command]
fn get_hosts_diff(block_name: String, entries: Vec<HostEntry>) -> Result<String, String> {
    hosts::get_hosts_diff(&block_name, &entries)
}

#[tauri::command]
fn write_hosts_block(
    app_handle: tauri::AppHandle,
    block_name: String,
    entries: Vec<HostEntry>,
) -> Result<(), String> {
    hosts::write_hosts_block(&app_handle, &block_name, &entries)
}

#[tauri::command]
fn remove_hosts_block(app_handle: tauri::AppHandle, block_name: String) -> Result<(), String> {
    // Passing empty entries removes the block from hosts file
    hosts::write_hosts_block(&app_handle, &block_name, &[])
}

#[tauri::command]
fn backup_hosts_file(app_handle: tauri::AppHandle, reason: String) -> Result<BackupRecord, String> {
    hosts::backup_hosts_file(&app_handle, &reason)
}

#[tauri::command]
fn restore_backup(app_handle: tauri::AppHandle, backup_id: String) -> Result<(), String> {
    hosts::restore_backup(&app_handle, &backup_id)
}

#[tauri::command]
fn delete_backup_file(app_handle: tauri::AppHandle, backup_id: String) -> Result<(), String> {
    hosts::delete_backup_file(&app_handle, &backup_id)
}

#[tauri::command]
async fn resolve_dynamic_host(
    dynamic_type: String,
    dynamic_value: String,
) -> Result<String, String> {
    hosts::resolve_dynamic_host(dynamic_type, dynamic_value).await
}

#[tauri::command]
fn load_app_config(app_handle: tauri::AppHandle) -> Result<AppConfig, String> {
    config::load_config(&app_handle)
}

#[tauri::command]
fn save_app_config(app_handle: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    config::save_config(&app_handle, &config)
}

#[tauri::command]
async fn check_port(host: String, port: u16) -> bool {
    tauri::async_runtime::spawn_blocking(move || ports::is_port_open(&host, port))
        .await
        .unwrap_or(false)
}

#[tauri::command]
fn save_config_file(content: String, default_name: String) -> Result<Option<String>, String> {
    let path = rfd::FileDialog::new()
        .set_title("Export Configuration")
        .set_file_name(&default_name)
        .add_filter("JSON Configuration", &["json"])
        .save_file();

    if let Some(file_path) = path {
        std::fs::write(&file_path, content)
            .map_err(|e| format!("Failed to write export file: {}", e))?;
        Ok(Some(file_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn reveal_in_finder(path: String) {
    #[cfg(target_os = "macos")]
    let _ = Command::new("open").arg("-R").arg(&path).spawn();

    #[cfg(target_os = "windows")]
    let _ = Command::new("explorer")
        .arg(format!("/select,\"{}\"", path))
        .spawn();

    #[cfg(target_os = "linux")]
    let _ = Command::new("xdg-open")
        .arg(
            std::path::Path::new(&path)
                .parent()
                .unwrap_or(std::path::Path::new("/")),
        )
        .spawn();
}

#[tauri::command]
fn open_in_browser(url: String) {
    #[cfg(target_os = "macos")]
    let _ = Command::new("open").arg(&url).spawn();

    #[cfg(target_os = "windows")]
    let _ = Command::new("cmd").args(&["/C", "start", &url]).spawn();

    #[cfg(target_os = "linux")]
    let _ = Command::new("xdg-open").arg(&url).spawn();
}

#[tauri::command]
fn get_default_hosts_path() -> String {
    hosts::get_hosts_path().to_string()
}

#[tauri::command]
fn get_default_backups_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let backup_dir = app_dir.join("backups");
    Ok(backup_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn select_backup_directory() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new()
        .set_title("Select Backup Directory")
        .pick_folder();
    Ok(folder.map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
fn get_system_locale() -> String {
    #[cfg(feature = "e2e-testing")]
    if std::env::var("HOSTPILOT_TEST_DATA_DIR").is_ok() {
        return "en".to_string();
    }
    sys_locale::get_locale().unwrap_or_else(|| "en".to_string())
}

#[tauri::command]
fn relaunch_app(app_handle: tauri::AppHandle) {
    app_handle.restart();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(feature = "e2e-testing")]
    {
        builder = builder.plugin(tauri_plugin_playwright::init());
    }

    builder
        .manage(proxy::ProxyState::new())
        .invoke_handler(tauri::generate_handler![
            close_splashscreen,
            read_hosts_file,
            get_hosts_diff,
            write_hosts_block,
            remove_hosts_block,
            backup_hosts_file,
            restore_backup,
            delete_backup_file,
            load_app_config,
            save_app_config,
            check_port,
            save_config_file,
            reveal_in_finder,
            open_in_browser,
            get_default_hosts_path,
            get_default_backups_path,
            select_backup_directory,
            get_system_locale,
            relaunch_app,
            start_proxy_server,
            stop_proxy_server,
            get_proxy_status,
            check_ca_status,
            install_root_ca,
            resolve_dynamic_host
        ])
        .setup(|app| {
            #[cfg(feature = "e2e-testing")]
            if std::env::var("HOSTPILOT_TEST_DATA_DIR").is_ok() {
                use tauri::Manager;
                if let Some(splashscreen) = app.get_webview_window("splashscreen") {
                    let _ = splashscreen.close();
                }
                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.show();
                    let _ = main.set_focus();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
