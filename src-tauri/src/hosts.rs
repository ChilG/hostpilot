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
    
    // Check if custom backup directory is set in app settings
    if let Ok(config) = crate::config::load_config(app_handle) {
        if let Some(settings) = config.settings {
            if !settings.backup_directory.trim().is_empty() {
                return Ok(PathBuf::from(settings.backup_directory));
            }
        }
    }
    
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
        block.push_str(&format!("# <<< HostPilot END: {}\n", block_name));
    }
    block
}

/// Replaces or appends a managed block in the hosts file content
pub fn replace_managed_block(
    original_content: &str,
    block_name: &str,
    new_block: &str,
    active_domains: &[String],
) -> String {
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
                for b_line in new_block.lines() {
                    new_lines.push(b_line.to_string());
                }
            }
            block_replaced = true;
            continue;
        }
        if trimmed == end_marker {
            in_block = false;
            continue;
        }
        if !in_block {
            let mut line_to_push = line.to_string();
            if !trimmed.is_empty() && !trimmed.starts_with('#') && !active_domains.is_empty() {
                let content_part = match trimmed.split_once('#') {
                    Some((before, _)) => before.trim(),
                    None => trimmed,
                };
                let tokens: Vec<&str> = content_part.split_whitespace().collect();
                if tokens.len() >= 2 {
                    let has_conflict = tokens[1..].iter().any(|domain| {
                        active_domains.contains(&domain.to_lowercase())
                    });
                    if has_conflict {
                        line_to_push = format!("# [HostPilot Overridden] {}", line);
                    }
                }
            }
            new_lines.push(line_to_push);
        }
    }
    
    // If block didn't exist before and we have new content to add, append it
    if !block_replaced && !new_block.is_empty() {
        // Ensure there is spacing before our block if content exists
        if !new_lines.is_empty() && !new_lines.last().unwrap().is_empty() {
            new_lines.push("".to_string());
        }
        for b_line in new_block.lines() {
            new_lines.push(b_line.to_string());
        }
    }
    
    let mut result = new_lines.join("\n");
    // Ensure trailing newline if original content had it, OR if the file now ends with our block (since our block must end with a newline)
    if (original_content.ends_with('\n') || !new_block.is_empty()) && !result.ends_with('\n') {
        result.push('\n');
    }
    result
}

/// Generates a unified diff comparing the current system hosts file and the proposed update
pub fn get_hosts_diff(block_name: &str, entries: &[HostEntry]) -> Result<String, String> {
    let raw_current = read_hosts_file()?;
    let current_content = raw_current.replace("\r\n", "\n").replace('\r', "\n");
    let new_block = build_managed_block(block_name, entries);
    let active_domains: Vec<String> = entries
        .iter()
        .filter(|h| h.enabled)
        .map(|h| h.domain.to_lowercase())
        .collect();
    let updated_content = replace_managed_block(&current_content, block_name, &new_block, &active_domains);
    let updated_normalized = updated_content.replace("\r\n", "\n").replace('\r', "\n");
    
    let mut diff_str = String::new();
    let diff = TextDiff::from_lines(&current_content, &updated_normalized);
    
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
fn copy_file_elevated(src: &Path, dest: &Path, flush_dns: bool) -> Result<(), String> {
    let src_str = src.to_string_lossy();
    let dest_str = dest.to_string_lossy();
    
    #[cfg(target_os = "macos")]
    {
        // MacOS elevation via osascript using cat instead of cp to keep the inode, attributes and file system watchers intact
        let mut shell_cmd = format!(
            "\"cat \" & quoted form of POSIX path of \"{}\" & \" > \" & quoted form of POSIX path of \"{}\" & \" && chown root:wheel \" & quoted form of POSIX path of \"{}\" & \" && chmod 644 \" & quoted form of POSIX path of \"{}\"",
            src_str, dest_str, dest_str, dest_str
        );
        if flush_dns {
            shell_cmd.push_str(" & \" && dscacheutil -flushcache && killall -HUP mDNSResponder\"");
        }
        let cmd = format!(
            "do shell script {} with administrator privileges",
            shell_cmd
        );
        let output = Command::new("osascript")
            .arg("-e")
            .arg(&cmd)
            .output()
            .map_err(|e| format!("Failed to execute elevation command: {}", e))?;
            
        if !output.status.success() {
            let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("macOS administrative elevated write failed: {}", err_msg));
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

/// Flushes the DNS cache on macOS
#[cfg(target_os = "macos")]
#[allow(dead_code)]
fn flush_dns_cache() -> Result<(), String> {
    let cmd = "do shell script \"dscacheutil -flushcache && killall -HUP mDNSResponder\" with administrator privileges";
    let output = Command::new("osascript")
        .arg("-e")
        .arg(cmd)
        .output()
        .map_err(|e| format!("Failed to execute DNS flush command: {}", e))?;
        
    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("macOS DNS cache flush failed: {}", err_msg));
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
    let active_domains: Vec<String> = entries
        .iter()
        .filter(|h| h.enabled)
        .map(|h| h.domain.to_lowercase())
        .collect();
    let updated_content = replace_managed_block(&current_content, block_name, &new_block, &active_domains);
    
    // Normalize line endings: convert \r\n to \n, then remaining \r to \n
    let normalized_content = updated_content.replace("\r\n", "\n").replace('\r', "\n");
    
    let dest_hosts = Path::new(get_hosts_path());
    
    // Try writing directly first (in case of user-writable hosts file, run as admin/root, etc.)
    let direct_write_res = fs::write(dest_hosts, &normalized_content);
    
    let apply_res = match direct_write_res {
        Ok(_) => {
            // Direct write succeeded, flush DNS cache on macOS
            #[cfg(target_os = "macos")]
            {
                let _ = Command::new("dscacheutil").arg("-flushcache").output();
                let _ = Command::new("killall").args(&["-HUP", "mDNSResponder"]).output();
            }
            Ok(())
        }
        Err(_) => {
            // Write updated content to a temporary file in the app data directory
            let app_dir = app_handle
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to get app data directory: {}", e))?;
            let temp_hosts = app_dir.join("hosts.temp");
            
            fs::write(&temp_hosts, &normalized_content)
                .map_err(|e| format!("Failed to write temporary hosts file: {}", e))?;
                
            // Execute administrative copy/write and flush DNS inside the same elevated call on macOS to avoid prompting twice
            let copy_res = copy_file_elevated(&temp_hosts, dest_hosts, true);
            let _ = fs::remove_file(&temp_hosts);
            
            copy_res
        }
    };
    
    if let Err(e) = apply_res {
        return Err(format!("Failed to apply hosts file changes: {}", e));
    }
    
    // Verify that /etc/hosts content matches the expected updated content
    let verified_content = read_hosts_file()?;
    let verified_normalized = verified_content.replace("\r\n", "\n").replace('\r', "\n");
    if verified_normalized != normalized_content {
        return Err("Verification failed: system hosts file content does not match the expected updated content.".to_string());
    }
    
    Ok(())
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
    
    let backup_content = fs::read_to_string(&backup_path)
        .map_err(|e| format!("Failed to read backup file: {}", e))?;
    let normalized_backup = backup_content.replace("\r\n", "\n").replace('\r', "\n");
    
    // Execute administrative copy/write and flush DNS inside the same elevated call on macOS to avoid prompting twice
    let dest_hosts = Path::new(get_hosts_path());
    copy_file_elevated(&backup_path, dest_hosts, true)
        .map_err(|e| format!("Failed to restore hosts backup: {}", e))?;
        
    // Verify
    let verified_content = read_hosts_file()?;
    let verified_normalized = verified_content.replace("\r\n", "\n").replace('\r', "\n");
    if verified_normalized != normalized_backup {
        return Err("Verification failed: system hosts file content does not match the restored backup content.".to_string());
    }
    
    Ok(())
}

/// Deletes a backup file physically from the filesystem
pub fn delete_backup_file(
    app_handle: &tauri::AppHandle,
    backup_id: &str,
) -> Result<(), String> {
    let backup_dir = get_backups_dir(app_handle)?;
    let timestamp = backup_id.strip_prefix("b_")
        .ok_or_else(|| format!("Invalid backup ID: {}", backup_id))?;
    let backup_filename = format!("hosts-{}.bak", timestamp);
    let backup_path = backup_dir.join(&backup_filename);
    
    if backup_path.exists() {
        fs::remove_file(&backup_path)
            .map_err(|e| format!("Failed to delete backup file physically: {}", e))?;
    }
    Ok(())
}

/// Resolves a dynamic host domain via URL redirect or command execution
pub async fn resolve_dynamic_host(
    dynamic_type: String,
    dynamic_value: String,
) -> Result<String, String> {
    if dynamic_type == "url" {
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let response = client
            .get(&dynamic_value)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        let status = response.status();

        if status.is_redirection() {
            if let Some(location) = response.headers().get(reqwest::header::LOCATION) {
                let location_str = location.to_str().map_err(|e| e.to_string())?;
                let parsed_url = reqwest::Url::parse(location_str)
                    .or_else(|_| reqwest::Url::parse(&format!("http://{}", location_str)))
                    .map_err(|e| format!("Failed to parse redirect Location URL: {}", e))?;
                if let Some(host) = parsed_url.host_str() {
                    return Ok(host.to_string());
                }
            }
            return Err("Redirect status received, but Location header is missing or invalid".to_string());
        } else if status.is_success() {
            let body = response.text().await.map_err(|e| format!("Failed to read response body: {}", e))?;
            
            if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&body) {
                if let Some(obj) = json_val.as_object() {
                    for key in &["domain", "host", "hostname", "url"] {
                        if let Some(val) = obj.get(*key) {
                            if let Some(val_str) = val.as_str() {
                                if let Some(extracted) = extract_host_from_text(val_str) {
                                    return Ok(extracted);
                                }
                            }
                        }
                    }
                }
            }
            
            if let Some(extracted) = extract_host_from_text(&body) {
                return Ok(extracted);
            }
            
            return Err(format!("Could not extract a valid domain name from response body: {}", body));
        } else {
            return Err(format!("Server returned HTTP status {}", status));
        }
    } else if dynamic_type == "script" {
        #[cfg(target_os = "windows")]
        let (shell, arg) = ("powershell", "-Command");
        #[cfg(not(target_os = "windows"))]
        let (shell, arg) = ("/bin/sh", "-c");

        let output = Command::new(shell)
            .arg(arg)
            .arg(&dynamic_value)
            .output()
            .map_err(|e| format!("Failed to run script: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(format!(
                "Script failed with code {}: {}",
                output.status.code().unwrap_or(-1),
                err
            ));
        }

        let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if let Some(extracted) = extract_host_from_text(&result) {
            return Ok(extracted);
        }

        return Err(format!("Script stdout '{}' is not a valid domain", result));
    } else {
        return Err(format!("Unsupported dynamic type: {}", dynamic_type));
    }
}

fn extract_host_from_text(text: &str) -> Option<String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(url) = reqwest::Url::parse(trimmed) {
        if let Some(host) = url.host_str() {
            return Some(host.to_string());
        }
    }
    if let Ok(url) = reqwest::Url::parse(&format!("http://{}", trimmed)) {
        if let Some(host) = url.host_str() {
            let host_re = regex::Regex::new(r"^[a-zA-Z0-9][-a-zA-Z0-9.]*$").unwrap();
            if host_re.is_match(host) {
                return Some(host.to_string());
            }
        }
    }
    None
}


#[cfg(test)]
pub mod tests {
    #[test]
    fn test_replace_managed_block() {
        let original = "127.0.0.1 localhost\n# >>> HostPilot START: test\n127.0.0.1 test.local\n# <<< HostPilot END: test\n::1 localhost";
        let new_block = "# >>> HostPilot START: test\n127.0.0.1 new.local\n# <<< HostPilot END: test\n";
        let result = super::replace_managed_block(original, "test", new_block, &[]);
        assert!(result.contains("new.local"));
        assert!(!result.contains("test.local"));
        assert!(result.contains("127.0.0.1 localhost"));
        assert!(!result.contains("# <<< HostPilot END: test\n\n::1 localhost"));
        assert!(result.contains("# <<< HostPilot END: test\n::1 localhost"));
    }

    #[test]
    fn test_replace_managed_block_crlf() {
        let original = "127.0.0.1 localhost\r\n# >>> HostPilot START: test\r\n127.0.0.1 test.local\r\n# <<< HostPilot END: test\r\n::1 localhost";
        let new_block = "# >>> HostPilot START: test\n127.0.0.1 new.local\n# <<< HostPilot END: test\n";
        let result = super::replace_managed_block(original, "test", new_block, &[]);
        assert!(result.contains("new.local"));
        assert!(!result.contains("test.local"));
        assert!(result.contains("127.0.0.1 localhost"));
    }

    #[test]
    fn test_replace_managed_block_conflict() {
        let original = "127.0.0.1 localhost\n192.168.1.1 conflict.local # Comment\n# >>> HostPilot START: test\n# <<< HostPilot END: test";
        let new_block = "# >>> HostPilot START: test\n127.0.0.1 conflict.local\n# <<< HostPilot END: test\n";
        let active_domains = vec!["conflict.local".to_string()];
        let result = super::replace_managed_block(original, "test", new_block, &active_domains);
        assert!(result.contains("# [HostPilot Overridden] 192.168.1.1 conflict.local # Comment"));
        assert!(result.contains("127.0.0.1 conflict.local"));
    }

    #[test]
    fn test_extract_host_from_text() {
        assert_eq!(super::extract_host_from_text("myapp1120.com"), Some("myapp1120.com".to_string()));
        assert_eq!(super::extract_host_from_text("http://myapp1120.com"), Some("myapp1120.com".to_string()));
        assert_eq!(super::extract_host_from_text("https://myapp1120.com:8080/path?param=1"), Some("myapp1120.com".to_string()));
        assert_eq!(super::extract_host_from_text("   myapp1120.com   \n"), Some("myapp1120.com".to_string()));
        assert_eq!(super::extract_host_from_text("invalid host name"), None);
    }
}
