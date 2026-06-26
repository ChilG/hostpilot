use hostpilot_lib::config::{HostEntry, ProxyRule, AppConfig};

#[test]
fn test_host_entry_round_trip() {
    let entry = HostEntry {
        id: "h1".to_string(),
        domain: "domain.local".to_string(),
        ip: "127.0.0.1".to_string(),
        enabled: true,
        group_id: Some("g1".to_string()),
        description: Some("Description".to_string()),
        source: "manual".to_string(),
        created_at: "2026-06-25T00:00:00Z".to_string(),
        updated_at: "2026-06-25T00:00:00Z".to_string(),
        is_dynamic: true,
        dynamic_type: Some("url".to_string()),
        dynamic_value: Some("http://localhost".to_string()),
        last_synced: Some("2026-06-25T00:01:00Z".to_string()),
        sync_interval: Some(60),
    };
    
    let serialized = serde_json::to_string(&entry).unwrap();
    let deserialized: HostEntry = serde_json::from_str(&serialized).unwrap();
    
    assert_eq!(deserialized.id, entry.id);
    assert_eq!(deserialized.domain, entry.domain);
    assert_eq!(deserialized.ip, entry.ip);
    assert_eq!(deserialized.enabled, entry.enabled);
    assert_eq!(deserialized.group_id, entry.group_id);
    assert_eq!(deserialized.is_dynamic, entry.is_dynamic);
    assert_eq!(deserialized.dynamic_type, entry.dynamic_type);
    assert_eq!(deserialized.sync_interval, entry.sync_interval);
}

#[test]
fn test_optional_fields_absent_in_json() {
    // When fields like group_id or description are None, they should serialize/deserialize properly.
    let json_str = r#"{
        "id": "h2",
        "domain": "test.local",
        "ip": "10.0.0.1",
        "enabled": false,
        "source": "imported",
        "createdAt": "2026-06-25T00:00:00Z",
        "updatedAt": "2026-06-25T00:00:00Z"
    }"#;
    
    let deserialized: HostEntry = serde_json::from_str(json_str).unwrap();
    assert_eq!(deserialized.id, "h2");
    assert_eq!(deserialized.group_id, None);
    assert_eq!(deserialized.description, None);
    assert_eq!(deserialized.is_dynamic, false); // defaults to false
}

#[test]
fn test_proxy_rule_boolean_defaults() {
    let json_str = r#"{
        "id": "pr1",
        "domain": "api.local",
        "pathPrefix": "/v1",
        "targetType": "local",
        "targetAddress": "http://127.0.0.1:8080",
        "createdAt": "2026-06-25",
        "updatedAt": "2026-06-25",
        "enabled": true
    }"#;
    
    let deserialized: ProxyRule = serde_json::from_str(json_str).unwrap();
    assert_eq!(deserialized.id, "pr1");
    assert_eq!(deserialized.strip_prefix, false); // Default when absent
    assert_eq!(deserialized.is_regex, false);     // Default when absent
}

#[test]
fn test_app_config_empty_round_trip() {
    let config = AppConfig::default();
    let serialized = serde_json::to_string(&config).unwrap();
    let deserialized: AppConfig = serde_json::from_str(&serialized).unwrap();
    
    assert!(deserialized.hosts.is_empty());
    assert!(deserialized.groups.is_empty());
    assert!(deserialized.profiles.is_empty());
    assert!(deserialized.ports.is_empty());
    assert!(deserialized.backups.is_empty());
    assert_eq!(deserialized.onboarded, false);
    assert!(deserialized.settings.is_none());
    assert!(deserialized.notifications.is_empty());
    assert!(deserialized.proxy_rules.is_empty());
}
