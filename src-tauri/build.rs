fn main() {
    let e2e_testing = std::env::var("CARGO_FEATURE_E2E_TESTING").is_ok();
    let target_dir = std::path::Path::new("capabilities");
    let target_file = target_dir.join("playwright.json");
    let source_file = std::path::Path::new("capabilities-e2e/playwright.json");

    if e2e_testing {
        if source_file.exists() {
            std::fs::create_dir_all(target_dir).unwrap();
            let source_content = std::fs::read(&source_file).unwrap();
            let needs_write = if target_file.exists() {
                let target_content = std::fs::read(&target_file).unwrap();
                source_content != target_content
            } else {
                true
            };
            if needs_write {
                std::fs::write(&target_file, source_content).unwrap();
            }
        }
    } else {
        if target_file.exists() {
            let _ = std::fs::remove_file(&target_file);
        }
    }

    tauri_build::build();
}
