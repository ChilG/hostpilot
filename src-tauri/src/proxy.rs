use axum::{
    routing::any,
    Router,
    http::{Request, Response, StatusCode, HeaderMap},
    body::Body,
};
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use std::sync::Mutex;
use tokio::sync::oneshot;
use tauri::Manager;
use crate::config::ProxyRule;
use hickory_resolver::Resolver;
use hickory_resolver::config::{ResolverConfig, ResolverOpts, NameServerConfigGroup};

pub struct ProxyState {
    pub shutdown_tx: Arc<Mutex<Option<oneshot::Sender<()>>>>,
    pub running_port: Arc<Mutex<Option<u16>>>,
}

impl ProxyState {
    pub fn new() -> Self {
        ProxyState {
            shutdown_tx: Arc::new(Mutex::new(None)),
            running_port: Arc::new(Mutex::new(None)),
        }
    }
}

fn log_proxy_error(error_msg: &str) {
    eprintln!("Proxy Server Error: {}", error_msg);
}

fn get_proxy_rules_for_domain(app_handle: &tauri::AppHandle, target_domain: &str) -> Result<Vec<ProxyRule>, String> {
    let conn = crate::db::get_connection(app_handle)?;
    let mut stmt = conn.prepare(
        "SELECT id, domain, path_prefix, target_type, target_address, custom_resolver, enabled, created_at, updated_at \
         FROM proxy_rules WHERE domain = ?1 AND enabled = 1 ORDER BY length(path_prefix) DESC;"
    ).map_err(|e| e.to_string())?;
    
    let rules_iter = stmt.query_map([target_domain], |row| {
        let enabled_val: i32 = row.get(6)?;
        Ok(ProxyRule {
            id: row.get(0)?,
            domain: row.get(1)?,
            path_prefix: row.get(2)?,
            target_type: row.get(3)?,
            target_address: row.get(4)?,
            custom_resolver: row.get(5)?,
            enabled: enabled_val != 0,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut rules = Vec::new();
    for r in rules_iter {
        rules.push(r.map_err(|e| e.to_string())?);
    }
    
    Ok(rules)
}

fn resolve_with_dns(host: &str, resolver_ip: &str) -> Result<IpAddr, String> {
    let dns_ip: IpAddr = resolver_ip.parse().map_err(|e| format!("Invalid DNS IP: {}", e))?;
    let config = ResolverConfig::from_parts(
        None,
        vec![],
        NameServerConfigGroup::from_ips_clear(&[dns_ip], 53, true)
    );
    let resolver = Resolver::new(config, ResolverOpts::default())
        .map_err(|e| format!("Failed to create DNS resolver: {}", e))?;
    
    let response = resolver.lookup_ip(host)
        .map_err(|e| format!("DNS lookup failed for {}: {}", host, e))?;
    
    response.iter().next().ok_or_else(|| format!("No IP address resolved for {}", host))
}

async fn forward_request_impl(
    client: &reqwest::Client,
    target_url: &str,
    method: reqwest::Method,
    headers: HeaderMap,
    body: Body,
    host_override: Option<&str>,
) -> Result<Response<Body>, String> {
    // 1. Convert axum body to bytes
    let bytes = axum::body::to_bytes(body, usize::MAX).await
        .map_err(|e| format!("Failed to read request body: {}", e))?;
    
    // 2. Build reqwest request
    let mut req_builder = client.request(method, target_url).body(bytes);
    
    // 3. Copy headers
    let mut req_headers = reqwest::header::HeaderMap::new();
    for (key, value) in headers.iter() {
        if key == axum::http::header::HOST {
            continue; // Skip host, we will set it explicitly or let reqwest do it
        }
        if key == axum::http::header::CONNECTION {
            continue; // Skip connection headers
        }
        req_headers.insert(key.clone(), value.clone());
    }
    
    if let Some(host) = host_override {
        let val = reqwest::header::HeaderValue::from_str(host)
            .map_err(|e| format!("Invalid Host override header: {}", e))?;
        req_headers.insert(reqwest::header::HOST, val);
    }
    
    req_builder = req_builder.headers(req_headers);
    
    // 4. Send request
    let res = req_builder.send().await
        .map_err(|e| format!("Request forwarding failed: {}", e))?;
    
    // 5. Convert reqwest Response to axum Response
    let status = StatusCode::from_u16(res.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut builder = Response::builder().status(status);
    
    let headers_mut = builder.headers_mut()
        .ok_or_else(|| "Failed to construct response headers".to_string())?;
    
    for (key, value) in res.headers().iter() {
        headers_mut.insert(key.clone(), value.clone());
    }
    
    let res_bytes = res.bytes().await
        .map_err(|e| format!("Failed to read response body: {}", e))?;
    
    let response = builder.body(Body::from(res_bytes))
        .map_err(|e| format!("Failed to construct response: {}", e))?;
    
    Ok(response)
}

async fn proxy_handler(
    app_handle: tauri::AppHandle,
    req: Request<Body>,
) -> Response<Body> {
    // 1. Get host header
    let host = match req.headers().get("host") {
        Some(h) => match h.to_str() {
            Ok(s) => s.split(':').next().unwrap_or(""),
            Err(_) => return Response::builder().status(StatusCode::BAD_REQUEST).body(Body::from("Invalid Host header")).unwrap(),
        },
        None => return Response::builder().status(StatusCode::BAD_REQUEST).body(Body::from("Host header is required")).unwrap(),
    };

    // 2. Fetch rules for this domain
    let rules = match get_proxy_rules_for_domain(&app_handle, host) {
        Ok(r) => r,
        Err(e) => return Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body(Body::from(format!("DB Error: {}", e))).unwrap(),
    };

    // 3. Match path
    let path = req.uri().path().to_string();
    let query = req.uri().query().unwrap_or("").to_string();
    let matched_rule = rules.iter().filter(|r| r.enabled && path.starts_with(&r.path_prefix)).max_by_key(|r| r.path_prefix.len());

    let rule = match matched_rule {
        Some(r) => r,
        None => return Response::builder().status(StatusCode::NOT_FOUND).body(Body::from(format!("No proxy rule matches domain: {} and path: {}", host, path))).unwrap(),
    };

    // 4. Forward request
    let client = reqwest::Client::new();
    let method = req.method().clone();
    let headers = req.headers().clone();
    let body = req.into_body();

    // Determine target URL
    let target_url = if rule.target_type == "external" {
        // Resolve domain name with custom resolver to avoid loop
        let resolver_ip = rule.custom_resolver.as_deref().unwrap_or("8.8.8.8");
        let target_host = match rule.target_address.strip_prefix("https://") {
            Some(h) => h.strip_prefix("http://").unwrap_or(h),
            None => rule.target_address.strip_prefix("http://").unwrap_or(&rule.target_address),
        }.split('/').next().unwrap_or("");
        
        let resolved_ip = match resolve_with_dns(target_host, resolver_ip) {
            Ok(ip) => ip.to_string(),
            Err(e) => return Response::builder().status(StatusCode::BAD_GATEWAY).body(Body::from(format!("DNS Resolve Error for {}: {}", target_host, e))).unwrap(),
        };
        
        let is_https = rule.target_address.starts_with("https://");
        let scheme = if is_https { "https" } else { "http" };
        
        if query.is_empty() {
            format!("{}://{}{}", scheme, resolved_ip, path)
        } else {
            format!("{}://{}{}?{}", scheme, resolved_ip, path, query)
        }
    } else {
        // Local address
        let base_url = rule.target_address.trim_end_matches('/');
        if query.is_empty() {
            format!("{}{}", base_url, path)
        } else {
            format!("{}{}?{}", base_url, path, query)
        }
    };

    let host_override = if rule.target_type == "external" {
        let target_host = match rule.target_address.strip_prefix("https://") {
            Some(h) => h.strip_prefix("http://").unwrap_or(h),
            None => rule.target_address.strip_prefix("http://").unwrap_or(&rule.target_address),
        }.split('/').next().unwrap_or("");
        Some(target_host)
    } else {
        None
    };

    match forward_request_impl(&client, &target_url, method, headers, body, host_override).await {
        Ok(res) => res,
        Err(e) => Response::builder().status(StatusCode::BAD_GATEWAY).body(Body::from(format!("Proxy Error: {}", e))).unwrap(),
    }
}

pub fn start_proxy(app_handle: tauri::AppHandle, port: u16) -> Result<(), String> {
    let state = app_handle.state::<ProxyState>();
    let mut shutdown_lock = state.shutdown_tx.lock().unwrap();
    let mut port_lock = state.running_port.lock().unwrap();
    
    if shutdown_lock.is_some() {
        return Err("Proxy server is already running".to_string());
    }
    
    let (tx, rx) = oneshot::channel::<()>();
    *shutdown_lock = Some(tx);
    *port_lock = Some(port);
    
    let app_handle_clone = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let app = Router::new()
            .fallback(any(move |req| proxy_handler(app_handle_clone, req)));
        
        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        let listener = match tokio::net::TcpListener::bind(&addr).await {
            Ok(l) => l,
            Err(e) => {
                log_proxy_error(&format!("Failed to bind to port {}: {}", port, e));
                return;
            }
        };
        
        let server = axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                let _ = rx.await;
            });
        
        if let Err(e) = server.await {
            log_proxy_error(&format!("Server error: {}", e));
        }
    });
    
    Ok(())
}

pub fn stop_proxy(app_handle: tauri::AppHandle) -> Result<(), String> {
    let state = app_handle.state::<ProxyState>();
    let mut shutdown_lock = state.shutdown_tx.lock().unwrap();
    let mut port_lock = state.running_port.lock().unwrap();
    
    if let Some(tx) = shutdown_lock.take() {
        let _ = tx.send(());
        *port_lock = None;
        Ok(())
    } else {
        Err("Proxy server is not running".to_string())
    }
}
