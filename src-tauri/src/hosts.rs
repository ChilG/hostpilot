use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::SystemTime;
use similar::{ChangeTag, TextDiff};
use tauri::Manager;
use crate::config::{HostEntry, BackupRecord};

/// Returns the system-specific hosts file path
pub fn get_hosts_path() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "C:\\Windows\\System32\\drivers\\etc\\hosts"
    }
    #[cfg(not(target_os = "windows"))]
    {
        "/etc/hosts"
    }
}

/// Helper to get the backups directory path inside app data dir
pub fn get_backups_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let backup_dir = app_dir.join("backups");
    Ok(backup_dir)
}

/// Reads the system hosts file content
pub fn read_hosts_file() -> Result<String, String> {
    let path = get_hosts_path();
    fs::read_to_string(path).map_err(|e| format!("Failed to read system hosts file ({}): {}", path, e))
}

/// Helper to generate managed block text for a profile
fn build_managed_block(block_name: &str, entries: &[HostEntry]) -> String {
    let mut block = String::new();
    if entries.iter().any(|h| h.enabled) {
        block.push_str(&format!("# >>> HostPilot START: {}\n", block_name));
        for entry in entries {
            if entry.enabled {
                block.push_str(&format!("{}   {}\n", entry.ip, entry.domain));
            }
        }
        block.push_str(&format!("# <<< HostPilot END: {}", block_name));
    }
    block
}

/// Replaces or appends a managed block in the hosts file content
pub fn replace_managed_block(original_content: &str, block_name: &str, new_block: &str) -> String {
    let lines: Vec<&str> = original_content.lines().collect();
    let mut new_lines = Vec::new();
    
    let start_marker = format!("# >>> HostPilot START: {}", block_name);
    let end_marker = format!("# <<< HostPilot END: {}", block_name);
    
    let mut in_block = false;
    let mut block_replaced = false;
    
    for line in lines {
        let trimmed = line.trim();
        if trimmed == start_marker {
            in_block = true;
            if !new_block.is_empty() {
                new_lines.push(new_block);
            }
            block_replaced = true;
            continue;
        }
        if trimmed == end_marker {
            in_block = false;
            continue;
        }
        if !in_block {
            new_lines.push(line);
        }
    }
    
    // If block didn't exist before and we have new content to add, append it
    if !block_replaced && !new_block.is_empty() {
        // Ensure there is spacing before our block if content exists
        if !new_lines.is_empty() && !new_lines.last().unwrap().is_empty() {
            new_lines.push("");
        }
        new_lines.push(new_block);
    }
    
    let mut result = new_lines.join("\n");
    // Ensure trailing newline if original content had it
    if original_content.ends_with('\n') && !result.ends_with('\n') {
        result.push('\n');
    }
    result
}

/// Generates a unified diff comparing the current system hosts file and the proposed update
pub fn get_hosts_diff(block_name: &str, entries: &[HostEntry]) -> Result<String, String> {
    let current_content = read_hosts_file()?;
    let new_block = build_managed_block(block_name, entries);
    let updated_content = replace_managed_block(&current_content, block_name, &new_block);
    
    let mut diff_str = String::new();
    let diff = TextDiff::from_lines(&current_content, &updated_content);
    
    for change in diff.iter_all_changes() {
        let sign = match change.tag() {
            ChangeTag::Delete => "-",
            ChangeTag::Insert => "+",
            ChangeTag::Equal => " ",
        };
        diff_str.push_str(&format!("{}{}", sign, change.value()));
    }
    
    Ok(diff_str)
}

/// Creates a backup of the system hosts file to the app's backup directory
pub fn backup_hosts_file(app_handle: &tauri::AppHandle, reason: &str) -> Result<BackupRecord, String> {
    let hosts_content = read_hosts_file()?;
    let backup_dir = get_backups_dir(app_handle)?;
    
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
        
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let id = format!("b_{}", timestamp);
    let backup_filename = format!("hosts-{}.bak", timestamp);
    let backup_path = backup_dir.join(&backup_filename);
    
    fs::write(&backup_path, &hosts_content)
        .map_err(|e| format!("Failed to write backup file: {}", e))?;
        
    let size_bytes = hosts_content.len();
    let size_str = if size_bytes < 1024 {
        format!("{} B", size_bytes)
    } else {
        format!("{:.1} KB", size_bytes as f64 / 1024.0)
    };
    
    // Return record to save into config
    use chrono::Utc;
    let created_at = Utc::now().to_rfc3339();
    
    Ok(BackupRecord {
        id,
        created_at,
        reason: reason.to_string(),
        size: size_str,
    })
}

/// Helper function to perform the elevated copy operation
fn copy_file_elevated(src: &Path, dest: &Path) -> Result<(), String> {
    let src_str = src.to_string_lossy();
    let dest_str = dest.to_string_lossy();
    
    #[cfg(target_os = "macos")]
    {
        // MacOS elevation via osascript
        let cmd = format!("do shell script \"cp '{}' '{}'\" with administrator privileges", src_str, dest_str);
        let output = Command::new("osascript")
            .arg("-e")
            .arg(&cmd)
            .output()
            .map_err(|e| format!("Failed to execute elevation command: {}", e))?;
            
        if !output.status.success() {
            let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("macOS administrative copy failed: {}", err_msg));
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux elevation via pkexec
        let output = Command::new("pkexec")
            .arg("cp")
            .arg(src)
            .arg(dest)
            .output()
            .map_err(|e| format!("Failed to execute elevation command: {}", e))?;
            
        if !output.status.success() {
            let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("Linux administrative copy failed: {}", err_msg));
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows elevation via PowerShell verb RunAs
        let ps_cmd = format!("Start-Process powershell -ArgumentList '-NoProfile -WindowStyle Hidden -Command Copy-Item \"{}\" \"{}\"' -Verb RunAs", src_str, dest_str);
        let output = Command::new("powershell")
            .arg("-Command")
            .arg(&ps_cmd)
            .output()
            .map_err(|e| format!("Failed to execute elevation command: {}", e))?;
            
        if !output.status.success() {
            let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("Windows administrative copy failed: {}", err_msg));
        }
    }
    
    Ok(())
}

/// Writes a managed hosts block to the system hosts file using privilege escalation
pub fn write_hosts_block(
    app_handle: &tauri::AppHandle,
    block_name: &str,
    entries: &[HostEntry],
) -> Result<(), String> {
    let current_content = read_hosts_file()?;
    let new_block = build_managed_block(block_name, entries);
    let updated_content = replace_managed_block(&current_content, block_name, &new_block);
    
    // Write updated content to a temporary file in the app data directory
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let temp_hosts = app_dir.join("hosts.temp");
    
    fs::write(&temp_hosts, &updated_content)
        .map_err(|e| format!("Failed to write temporary hosts file: {}", e))?;
        
    // Execute administrative copy
    let dest_hosts = Path::new(get_hosts_path());
    let copy_res = copy_file_elevated(&temp_hosts, dest_hosts);
    
    // Clean up temporary file
    let _ = fs::remove_file(&temp_hosts);
    
    copy_res
}

/// Restores a backup file to `/etc/hosts`
pub fn restore_backup(
    app_handle: &tauri::AppHandle,
    backup_id: &str,
) -> Result<(), String> {
    // Locate the backup file
    let backup_dir = get_backups_dir(app_handle)?;
    
    // The backup_id is formed as b_[timestamp]. We expect files named hosts-[timestamp].bak
    let timestamp = backup_id.strip_prefix("b_")
        .ok_or_else(|| format!("Invalid backup ID: {}", backup_id))?;
    let backup_filename = format!("hosts-{}.bak", timestamp);
    let backup_path = backup_dir.join(&backup_filename);
    
    if !backup_path.exists() {
        return Err(format!("Backup file not found: {}", backup_path.to_string_lossy()));
    }
    
    let dest_hosts = Path::new(get_hosts_path());
    copy_file_elevated(&backup_path, dest_hosts)
}

pub mod tests {
    #[test]
    fn test_replace_managed_block() {
        let original = "127.0.0.1 localhost\n# >>> HostPilot START: test\n127.0.0.1 test.local\n# <<< HostPilot END: test\n::1 localhost";
        let new_block = "# >>> HostPilot START: test\n127.0.0.1 new.local\n# <<< HostPilot END: test";
        let result = super::replace_managed_block(original, "test", new_block);
        assert!(result.contains("new.local"));
        assert!(!result.contains("test.local"));
        assert!(result.contains("127.0.0.1 localhost"));
    }
}
