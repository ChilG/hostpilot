use hostpilot_lib::config::*;
use hostpilot_lib::db::{init_db_from_conn, save_config_to_conn, load_config_from_conn};

fn create_test_db() -> rusqlite::Connection {
    let mut conn = rusqlite::Connection::open(":memory:").unwrap();
    init_db_from_conn(&mut conn).unwrap();
    conn
}

fn make_empty_config() -> AppConfig {
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

fn make_host(id: &str, domain: &str, ip: &str) -> HostEntry {
    HostEntry {
        id: id.to_string(),
        domain: domain.to_string(),
        ip: ip.to_string(),
        enabled: true,
        group_id: None,
        description: Some("Test host".to_string()),
        source: "manual".to_string(),
        created_at: "2026-06-25T00:00:00Z".to_string(),
        updated_at: "2026-06-25T00:00:00Z".to_string(),
        is_dynamic: false,
        dynamic_type: None,
        dynamic_value: None,
        last_synced: None,
        sync_interval: None,
    }
}

fn make_group(id: &str, name: &str) -> HostGroup {
    HostGroup {
        id: id.to_string(),
        name: name.to_string(),
        description: Some("Test group".to_string()),
        color: "#ff0000".to_string(),
    }
}

fn make_profile(id: &str, name: &str) -> HostProfile {
    HostProfile {
        id: id.to_string(),
        name: name.to_string(),
        description: Some("Test profile".to_string()),
        entry_ids: vec![],
        group_ids: vec![],
        active: false,
        favorite: false,
        created_at: "2026-06-25T00:00:00Z".to_string(),
        updated_at: "2026-06-25T00:00:00Z".to_string(),
    }
}

#[test]
fn test_save_and_load_hosts_round_trip() {
    let mut conn = create_test_db();
    let mut config = make_empty_config();
    
    let host1 = make_host("h1", "domain1.local", "127.0.0.1");
    let host2 = make_host("h2", "domain2.local", "10.0.0.1");
    config.hosts = vec![host1, host2];
    
    save_config_to_conn(&mut conn, &config).unwrap();
    
    let loaded = load_config_from_conn(&conn).unwrap();
    assert_eq!(loaded.hosts.len(), 2);
    assert_eq!(loaded.hosts[0].id, "h1");
    assert_eq!(loaded.hosts[0].domain, "domain1.local");
    assert_eq!(loaded.hosts[1].id, "h2");
}

#[test]
fn test_save_and_load_groups_round_trip() {
    let mut conn = create_test_db();
    let mut config = make_empty_config();
    
    let g1 = make_group("g1", "Group 1");
    config.groups = vec![g1];
    
    save_config_to_conn(&mut conn, &config).unwrap();
    
    let loaded = load_config_from_conn(&conn).unwrap();
    assert_eq!(loaded.groups.len(), 1);
    assert_eq!(loaded.groups[0].id, "g1");
    assert_eq!(loaded.groups[0].name, "Group 1");
}

#[test]
fn test_save_and_load_profiles_with_entry_ids() {
    let mut conn = create_test_db();
    let mut config = make_empty_config();
    
    let host = make_host("h1", "domain.local", "127.0.0.1");
    let mut profile = make_profile("p1", "Profile 1");
    profile.entry_ids = vec!["h1".to_string()];
    
    config.hosts = vec![host];
    config.profiles = vec![profile];
    
    save_config_to_conn(&mut conn, &config).unwrap();
    
    let loaded = load_config_from_conn(&conn).unwrap();
    assert_eq!(loaded.profiles.len(), 1);
    assert_eq!(loaded.profiles[0].id, "p1");
    assert_eq!(loaded.profiles[0].entry_ids, vec!["h1".to_string()]);
}

#[test]
fn test_save_and_load_profiles_with_group_ids() {
    let mut conn = create_test_db();
    let mut config = make_empty_config();
    
    let group = make_group("g1", "Group 1");
    let mut profile = make_profile("p1", "Profile 1");
    profile.group_ids = vec!["g1".to_string()];
    
    config.groups = vec![group];
    config.profiles = vec![profile];
    
    save_config_to_conn(&mut conn, &config).unwrap();
    
    let loaded = load_config_from_conn(&conn).unwrap();
    assert_eq!(loaded.profiles.len(), 1);
    assert_eq!(loaded.profiles[0].id, "p1");
    assert_eq!(loaded.profiles[0].group_ids, vec!["g1".to_string()]);
}

#[test]
fn test_save_idempotency() {
    let mut conn = create_test_db();
    let mut config = make_empty_config();
    
    let host = make_host("h1", "domain.local", "127.0.0.1");
    config.hosts = vec![host];
    
    // Save first time
    save_config_to_conn(&mut conn, &config).unwrap();
    
    // Save second time (same config)
    save_config_to_conn(&mut conn, &config).unwrap();
    
    let loaded = load_config_from_conn(&conn).unwrap();
    assert_eq!(loaded.hosts.len(), 1);
    assert_eq!(loaded.hosts[0].id, "h1");
}

#[test]
fn test_orphaned_entry_ids_silently_skipped() {
    let mut conn = create_test_db();
    let mut config = make_empty_config();
    
    let mut profile = make_profile("p1", "Profile 1");
    // "h-missing" does not exist in config.hosts
    profile.entry_ids = vec!["h-missing".to_string()];
    config.profiles = vec![profile];
    
    save_config_to_conn(&mut conn, &config).unwrap();
    
    let loaded = load_config_from_conn(&conn).unwrap();
    assert_eq!(loaded.profiles.len(), 1);
    assert!(loaded.profiles[0].entry_ids.is_empty());
}

#[test]
fn test_orphaned_group_ids_silently_skipped() {
    let mut conn = create_test_db();
    let mut config = make_empty_config();
    
    let mut profile = make_profile("p1", "Profile 1");
    // "g-missing" does not exist in config.groups
    profile.group_ids = vec!["g-missing".to_string()];
    config.profiles = vec![profile];
    
    save_config_to_conn(&mut conn, &config).unwrap();
    
    let loaded = load_config_from_conn(&conn).unwrap();
    assert_eq!(loaded.profiles.len(), 1);
    assert!(loaded.profiles[0].group_ids.is_empty());
}

#[test]
fn test_save_and_load_settings_json_blob() {
    let mut conn = create_test_db();
    let mut config = make_empty_config();
    
    let settings = AppSettings {
        hosts_path: "/etc/hosts".to_string(),
        preview_before_apply: true,
        backup_before_write: false,
        validate_before_write: true,
        backup_directory: "/tmp/backup".to_string(),
        keep_backups_count: 5,
        auto_cleanup_backups: true,
        show_apply_notifications: true,
        show_error_alerts: true,
        port_status_alerts: false,
        color_theme: "dark".to_string(),
        language: "th".to_string(),
        ssl_enabled: true,
        ssl_port: 8443,
    };
    config.settings = Some(settings);
    
    save_config_to_conn(&mut conn, &config).unwrap();
    
    let loaded = load_config_from_conn(&conn).unwrap();
    assert!(loaded.settings.is_some());
    let loaded_settings = loaded.settings.unwrap();
    assert_eq!(loaded_settings.hosts_path, "/etc/hosts");
    assert_eq!(loaded_settings.preview_before_apply, true);
    assert_eq!(loaded_settings.backup_before_write, false);
    assert_eq!(loaded_settings.keep_backups_count, 5);
    assert_eq!(loaded_settings.color_theme, "dark");
    assert_eq!(loaded_settings.ssl_enabled, true);
    assert_eq!(loaded_settings.ssl_port, 8443);
}
