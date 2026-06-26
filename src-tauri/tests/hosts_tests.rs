use hostpilot_lib::config::HostEntry;
use hostpilot_lib::hosts::{build_managed_block, replace_managed_block};

fn make_entry(domain: &str, ip: &str, enabled: bool) -> HostEntry {
    HostEntry {
        id: "test-id".to_string(),
        domain: domain.to_string(),
        ip: ip.to_string(),
        enabled,
        group_id: None,
        description: None,
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

#[test]
fn test_build_block_with_enabled_entries() {
    let entries = vec![
        make_entry("google.com", "1.1.1.1", true),
        make_entry("yahoo.com", "2.2.2.2", true),
    ];
    let block = build_managed_block("test-profile", &entries);
    assert!(block.starts_with("# >>> HostPilot START: test-profile\n"));
    assert!(block.contains("1.1.1.1   google.com\n"));
    assert!(block.contains("2.2.2.2   yahoo.com\n"));
    assert!(block.ends_with("# <<< HostPilot END: test-profile\n"));
}

#[test]
fn test_build_block_all_disabled() {
    let entries = vec![
        make_entry("google.com", "1.1.1.1", false),
        make_entry("yahoo.com", "2.2.2.2", false),
    ];
    let block = build_managed_block("test-profile", &entries);
    assert_eq!(block, "");
}

#[test]
fn test_build_block_mixed_enabled() {
    let entries = vec![
        make_entry("google.com", "1.1.1.1", true),
        make_entry("yahoo.com", "2.2.2.2", false),
    ];
    let block = build_managed_block("test-profile", &entries);
    assert!(block.starts_with("# >>> HostPilot START: test-profile\n"));
    assert!(block.contains("1.1.1.1   google.com\n"));
    assert!(!block.contains("yahoo.com"));
    assert!(block.ends_with("# <<< HostPilot END: test-profile\n"));
}

#[test]
fn test_build_block_format() {
    let entries = vec![make_entry("local.dev", "127.0.0.1", true)];
    let block = build_managed_block("dev", &entries);
    let expected = "# >>> HostPilot START: dev\n127.0.0.1   local.dev\n# <<< HostPilot END: dev\n";
    assert_eq!(block, expected);
}

#[test]
fn test_replace_append_new_block() {
    let original = "127.0.0.1 localhost\n::1 localhost\n";
    let new_block = "# >>> HostPilot START: p1\n1.2.3.4 my.site\n# <<< HostPilot END: p1\n";
    let result = replace_managed_block(original, "p1", new_block, &[]);
    let expected = "127.0.0.1 localhost\n::1 localhost\n\n# >>> HostPilot START: p1\n1.2.3.4 my.site\n# <<< HostPilot END: p1\n";
    assert_eq!(result, expected);
}

#[test]
fn test_replace_existing_block() {
    let original = "127.0.0.1 localhost\n\n# >>> HostPilot START: p1\n1.2.3.4 old.site\n# <<< HostPilot END: p1\n\n::1 localhost\n";
    let new_block = "# >>> HostPilot START: p1\n5.6.7.8 new.site\n# <<< HostPilot END: p1\n";
    let result = replace_managed_block(original, "p1", new_block, &[]);
    let expected = "127.0.0.1 localhost\n\n# >>> HostPilot START: p1\n5.6.7.8 new.site\n# <<< HostPilot END: p1\n\n::1 localhost\n";
    assert_eq!(result, expected);
}

#[test]
fn test_replace_remove_block() {
    let original = "127.0.0.1 localhost\n# >>> HostPilot START: p1\n1.2.3.4 old.site\n# <<< HostPilot END: p1\n::1 localhost\n";
    let result = replace_managed_block(original, "p1", "", &[]);
    let expected = "127.0.0.1 localhost\n::1 localhost\n";
    assert_eq!(result, expected);
}

#[test]
fn test_replace_conflict_detection() {
    let original = "127.0.0.1 conflict.local\n";
    let new_block = "# >>> HostPilot START: p1\n1.2.3.4 conflict.local\n# <<< HostPilot END: p1\n";
    let active_domains = vec!["conflict.local".to_string()];
    let result = replace_managed_block(original, "p1", new_block, &active_domains);
    let expected = "# [HostPilot Overridden] 127.0.0.1 conflict.local\n\n# >>> HostPilot START: p1\n1.2.3.4 conflict.local\n# <<< HostPilot END: p1\n";
    assert_eq!(result, expected);
}

#[test]
fn test_replace_no_false_positive_in_comment() {
    let original = "# 127.0.0.1 conflict.local\n";
    let new_block = "# >>> HostPilot START: p1\n1.2.3.4 conflict.local\n# <<< HostPilot END: p1\n";
    let active_domains = vec!["conflict.local".to_string()];
    let result = replace_managed_block(original, "p1", new_block, &active_domains);
    let expected = "# 127.0.0.1 conflict.local\n\n# >>> HostPilot START: p1\n1.2.3.4 conflict.local\n# <<< HostPilot END: p1\n";
    assert_eq!(result, expected);
}

#[test]
fn test_replace_trailing_newline() {
    let original = "127.0.0.1 localhost"; // No trailing newline
    let new_block = "# >>> HostPilot START: p1\n1.2.3.4 test.site\n# <<< HostPilot END: p1\n";
    let result = replace_managed_block(original, "p1", new_block, &[]);
    let expected = "127.0.0.1 localhost\n\n# >>> HostPilot START: p1\n1.2.3.4 test.site\n# <<< HostPilot END: p1\n";
    assert_eq!(result, expected);
}

#[test]
fn test_replace_crlf_input() {
    let original = "127.0.0.1 localhost\r\n::1 localhost\r\n";
    let new_block = "# >>> HostPilot START: p1\n1.2.3.4 test.site\n# <<< HostPilot END: p1\n";
    let result = replace_managed_block(original, "p1", new_block, &[]);
    // CRLF line endings are normalized to LF in replacement
    assert!(result.contains("127.0.0.1 localhost\n"));
}

#[test]
fn test_replace_multiple_non_hp_entries() {
    let original = "127.0.0.1 localhost\n8.8.8.8 dns.google\n";
    let new_block = "# >>> HostPilot START: p1\n1.2.3.4 test.site\n# <<< HostPilot END: p1\n";
    let result = replace_managed_block(original, "p1", new_block, &[]);
    assert!(result.contains("8.8.8.8 dns.google"));
}

#[test]
fn test_replace_blank_line_before_append() {
    let original = "127.0.0.1 localhost\n";
    let new_block = "# >>> HostPilot START: p1\n1.2.3.4 test\n# <<< HostPilot END: p1\n";
    let result = replace_managed_block(original, "p1", new_block, &[]);
    let expected = "127.0.0.1 localhost\n\n# >>> HostPilot START: p1\n1.2.3.4 test\n# <<< HostPilot END: p1\n";
    assert_eq!(result, expected);
}
