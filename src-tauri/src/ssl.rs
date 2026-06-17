use std::path::PathBuf;
use std::fs;
use tauri::Manager;
use rcgen::{CertificateParams, IsCa, BasicConstraints, DistinguishedName, DnType, KeyPair};

pub fn get_ssl_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let ssl_dir = app_dir.join("ssl");
    fs::create_dir_all(&ssl_dir).map_err(|e| format!("Failed to create SSL directory: {}", e))?;
    Ok(ssl_dir)
}

pub fn init_root_ca(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let ssl_dir = get_ssl_dir(app_handle)?;
    let ca_key_path = ssl_dir.join("ca.key");
    let ca_cert_path = ssl_dir.join("ca.crt");

    if ca_key_path.exists() && ca_cert_path.exists() {
        return Ok(());
    }

    let mut params = CertificateParams::default();
    params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    
    // Set validity for 10 years
    params.not_before = rcgen::date_time_ymd(2026, 1, 1);
    params.not_after = rcgen::date_time_ymd(2036, 1, 1);

    let mut dn = DistinguishedName::new();
    dn.push(DnType::CommonName, "HostPilot Local Root CA");
    dn.push(DnType::OrganizationName, "HostPilot Development CA");
    params.distinguished_name = dn;

    params.key_usages = vec![
        rcgen::KeyUsagePurpose::KeyCertSign,
        rcgen::KeyUsagePurpose::CrlSign,
        rcgen::KeyUsagePurpose::DigitalSignature,
    ];

    let key_pair = KeyPair::generate()
        .map_err(|e| format!("Failed to generate CA key pair: {}", e))?;

    let cert = params.self_signed(&key_pair)
        .map_err(|e| format!("Failed to create CA certificate: {}", e))?;
    
    let cert_pem = cert.pem();
    let key_pem = key_pair.serialize_pem();

    fs::write(&ca_key_path, key_pem).map_err(|e| format!("Failed to write CA key: {}", e))?;
    fs::write(&ca_cert_path, cert_pem).map_err(|e| format!("Failed to write CA certificate: {}", e))?;

    Ok(())
}

pub fn is_ca_trusted() -> bool {
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("security")
            .args(["find-certificate", "-c", "HostPilot Local Root CA"])
            .output();
        match output {
            Ok(out) => out.status.success(),
            Err(_) => false,
        }
    }
    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("certutil")
            .args(["-viewstore", "-user", "ROOT", "HostPilot Local Root CA"])
            .output();
        match output {
            Ok(out) => out.status.success(),
            Err(_) => false,
        }
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        // For other OS, check if files exist as a fallback
        false
    }
}

pub fn install_root_ca(app_handle: &tauri::AppHandle) -> Result<(), String> {
    // Make sure CA is generated
    init_root_ca(app_handle)?;

    let ssl_dir = get_ssl_dir(app_handle)?;
    let ca_cert_path = ssl_dir.join("ca.crt");

    if !ca_cert_path.exists() {
        return Err("CA certificate file does not exist".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME environment variable not set".to_string())?;
        let keychain_path = format!("{}/Library/Keychains/login.keychain-db", home);
        
        let mut args = vec![
            "add-trusted-cert",
            "-d", "-r", "trustRoot",
        ];
        
        let keychain_exists = std::path::Path::new(&keychain_path).exists();
        if keychain_exists {
            args.push("-k");
            args.push(&keychain_path);
        }
        
        let ca_str = ca_cert_path.to_str().ok_or("Invalid CA path string")?;
        args.push(ca_str);

        let output = std::process::Command::new("security")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to execute security command: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to trust Root CA: {}", stderr));
        }
    }

    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("certutil")
            .args([
                "-addstore", "-f", "ROOT",
                ca_cert_path.to_str().unwrap()
            ])
            .output()
            .map_err(|e| format!("Failed to execute certutil command: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to trust Root CA: {}", stderr));
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        return Err("Automatic trust store installation is not supported on this platform. Please install ca.crt manually.".to_string());
    }

    Ok(())
}

pub fn get_active_proxy_domains(app_handle: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let conn = crate::db::get_connection(app_handle)?;
    let mut stmt = conn.prepare("SELECT DISTINCT domain FROM proxy_rules WHERE enabled = 1;")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    
    let mut domains = Vec::new();
    for r in rows {
        if let Ok(d) = r {
            domains.push(d);
        }
    }
    Ok(domains)
}

pub fn get_or_create_unified_cert(app_handle: &tauri::AppHandle, domains: Vec<String>) -> Result<(String, String), String> {
    let ssl_dir = get_ssl_dir(app_handle)?;
    let certs_dir = ssl_dir.join("certs");
    fs::create_dir_all(&certs_dir).map_err(|e| format!("Failed to create certs directory: {}", e))?;

    let cert_path = certs_dir.join("unified.crt");
    let key_path = certs_dir.join("unified.key");

    // Load Root CA
    let ca_key_path = ssl_dir.join("ca.key");
    let ca_cert_path = ssl_dir.join("ca.crt");
    
    if !ca_key_path.exists() || !ca_cert_path.exists() {
        init_root_ca(app_handle)?;
    }

    let ca_key_pem = fs::read_to_string(&ca_key_path).map_err(|e| format!("Failed to read CA key: {}", e))?;
    let ca_cert_pem = fs::read_to_string(&ca_cert_path).map_err(|e| format!("Failed to read CA cert: {}", e))?;

    let ca_key_pair = KeyPair::from_pem(&ca_key_pem)
        .map_err(|e| format!("Failed to parse CA key pair: {}", e))?;
    let ca_params = CertificateParams::from_ca_cert_pem(&ca_cert_pem)
        .map_err(|e| format!("Failed to parse CA cert params: {}", e))?;
    let ca_cert = ca_params.self_signed(&ca_key_pair)
        .map_err(|e| format!("Failed to instantiate CA certificate: {}", e))?;

    // Create unified certificate params
    let mut params = CertificateParams::default();
    params.is_ca = IsCa::NoCa;
    
    // Valid for 1 year
    params.not_before = rcgen::date_time_ymd(2026, 1, 1);
    params.not_after = rcgen::date_time_ymd(2027, 1, 1);

    let mut dn = DistinguishedName::new();
    dn.push(DnType::CommonName, "HostPilot Unified Local Cert");
    params.distinguished_name = dn;

    let mut sans = vec![
        rcgen::SanType::DnsName(rcgen::Ia5String::try_from("localhost".to_string()).unwrap()),
        rcgen::SanType::DnsName(rcgen::Ia5String::try_from("127.0.0.1".to_string()).unwrap()),
    ];

    for d in domains {
        let trimmed = d.trim().to_string();
        if !trimmed.is_empty() {
            if let Ok(san1) = rcgen::Ia5String::try_from(trimmed.clone()) {
                sans.push(rcgen::SanType::DnsName(san1));
            }
            if let Ok(san2) = rcgen::Ia5String::try_from(format!("*.{}", trimmed)) {
                sans.push(rcgen::SanType::DnsName(san2));
            }
        }
    }
    params.subject_alt_names = sans;

    let key_pair = KeyPair::generate()
        .map_err(|e| format!("Failed to generate domain key pair: {}", e))?;
    let cert = params.signed_by(&key_pair, &ca_cert, &ca_key_pair)
        .map_err(|e| format!("Failed to sign domain certificate: {}", e))?;

    let cert_pem = cert.pem();
    let key_pem = key_pair.serialize_pem();

    fs::write(&cert_path, &cert_pem).map_err(|e| format!("Failed to write unified cert: {}", e))?;
    fs::write(&key_path, &key_pem).map_err(|e| format!("Failed to write unified key: {}", e))?;

    Ok((cert_pem, key_pem))
}
