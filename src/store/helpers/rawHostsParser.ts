export interface RawParsedHost {
  ip: string;
  domain: string;
  enabled: boolean;
}

export interface RawParseResult {
  hosts: RawParsedHost[];
  stats: {
    totalLines: number;
    parsedHosts: number;
    skippedLines: number;
    commentedHosts: number;
    activeHosts: number;
  };
}

// Regex to validate IPv4
const IPV4_REGEX = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// Regex to validate IPv6 (simplified but effective for hosts file context)
const IPV6_REGEX = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

// Simple domain/hostname validation regex
const DOMAIN_REGEX = /^[a-zA-Z0-9_.-]+$/;

export function parseRawHostsText(text: string): RawParseResult {
  const hosts: RawParsedHost[] = [];
  let totalLines = 0;
  let skippedLines = 0;
  let commentedHosts = 0;
  let activeHosts = 0;

  if (!text) {
    return {
      hosts: [],
      stats: { totalLines: 0, parsedHosts: 0, skippedLines: 0, commentedHosts: 0, activeHosts: 0 }
    };
  }

  // Split lines by newline (supporting Windows CRLF as well)
  const lines = text.split(/\r?\n/);
  totalLines = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    let line = rawLine.trim();

    if (!line) {
      skippedLines++;
      continue;
    }

    let isCommented = false;

    // Check if the line is commented out at the beginning
    if (line.startsWith("#")) {
      isCommented = true;
      // Strip the leading '#' to parse the underlying content
      line = line.substring(1).trim();
    }

    // Strip any inline comments (e.g. 127.0.0.1 domain.com # some comment)
    const commentIndex = line.indexOf("#");
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex).trim();
    }

    if (!line) {
      skippedLines++;
      continue;
    }

    // Split line by whitespace to get IP and domains
    const tokens = line.split(/\s+/);
    if (tokens.length < 2) {
      skippedLines++;
      continue;
    }

    const ip = tokens[0];
    const domains = tokens.slice(1);

    // Validate IP address format
    const isValidIp = IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip);
    if (!isValidIp) {
      skippedLines++;
      continue;
    }

    let parsedInThisLine = 0;
    for (const domain of domains) {
      if (DOMAIN_REGEX.test(domain)) {
        hosts.push({
          ip,
          domain: domain.toLowerCase(),
          enabled: !isCommented
        });
        parsedInThisLine++;
        if (isCommented) {
          commentedHosts++;
        } else {
          activeHosts++;
        }
      }
    }

    if (parsedInThisLine === 0) {
      skippedLines++;
    }
  }

  return {
    hosts,
    stats: {
      totalLines,
      parsedHosts: hosts.length,
      skippedLines,
      commentedHosts,
      activeHosts
    }
  };
}
