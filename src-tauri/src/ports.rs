use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

/// Checks if a TCP port is open on the specified host.
pub fn is_port_open(host: &str, port: u16) -> bool {
    // Resolve host and port to socket addresses
    let addr_str = format!("{}:{}", host, port);
    if let Ok(addrs) = addr_str.parse::<SocketAddr>() {
        TcpStream::connect_timeout(&addrs, Duration::from_millis(300)).is_ok()
    } else if let Ok(mut addrs) = format!("{}:{}", host, port).to_socket_addrs() {
        // Fallback for names that need DNS resolution (e.g. localhost)
        if let Some(addr) = addrs.next() {
            TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
        } else {
            false
        }
    } else {
        // If resolution fails, try parsing localhost IP directly as a last resort
        let ip = if host == "localhost" { "127.0.0.1" } else { host };
        if let Ok(addr) = format!("{}:{}", ip, port).parse::<SocketAddr>() {
            TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
        } else {
            false
        }
    }
}

// Helper trait to support DNS resolution of host names
use std::net::ToSocketAddrs;
