import { type HostEntry, type HostGroup, type HostProfile, type PortRule, type ProxyRule } from "../types";

export interface ImportedConfig {
  hosts?: any[];
  groups?: any[];
  profiles?: any[];
  ports?: any[];
  proxyRules?: any[];
}

export interface CurrentStoreState {
  hosts: HostEntry[];
  groups: HostGroup[];
  profiles: HostProfile[];
  ports: PortRule[];
  proxyRules: ProxyRule[];
}

export interface MergeResult {
  nextHosts: HostEntry[];
  nextGroups: HostGroup[];
  nextProfiles: HostProfile[];
  nextPorts: PortRule[];
  nextProxyRules: ProxyRule[];
  stats: {
    hostsImported: number;
    groupsImported: number;
    profilesImported: number;
    portsImported: number;
    proxyRulesImported: number;
  };
}

export function mergeImportedConfig(
  configData: ImportedConfig,
  currentState: CurrentStoreState,
  uid: () => string,
  now: () => string,
  defaultImportedDesc: string,
  duplicateStrategy: "skip" | "overwrite" | "duplicate" = "skip",
  addToActiveProfile: boolean = false
): MergeResult {
  const groupsData = configData.groups || [];
  const hostsData = configData.hosts || [];
  const profilesData = configData.profiles || [];
  const portsData = configData.ports || [];
  const proxyRulesData = configData.proxyRules || [];

  let groupsImported = 0;
  let hostsImported = 0;
  let profilesImported = 0;
  let portsImported = 0;
  let proxyRulesImported = 0;

  const groupOldToNewId: Record<string, string> = {};
  const hostOldToNewId: Record<string, string> = {};
  const importedIds: string[] = [];

  // 1. Merge Groups
  let nextGroups = [...currentState.groups];
  groupsData.forEach((g) => {
    if (!g.name) return;
    const existing = nextGroups.find((eg) => eg.name.toLowerCase() === g.name.toLowerCase());
    if (existing) {
      groupOldToNewId[g.id || g.name] = existing.id;
    } else {
      const newId = uid();
      nextGroups.push({
        id: newId,
        name: g.name,
        color: g.color || "gray",
        description: g.description || null,
      });
      groupOldToNewId[g.id || g.name] = newId;
      groupsImported++;
    }
  });

  // 2. Merge Hosts
  let nextHosts = [...currentState.hosts];
  hostsData.forEach((h) => {
    const domain = h.domain || h.name;
    if (!domain || !h.ip) return;
    
    const existing = nextHosts.find((eh) => eh.domain.toLowerCase() === domain.toLowerCase());
    
    if (existing && duplicateStrategy === "skip") {
      hostOldToNewId[h.id || h.name] = existing.id;
      importedIds.push(existing.id);
    } else if (existing && duplicateStrategy === "overwrite") {
      hostOldToNewId[h.id || h.name] = existing.id;
      importedIds.push(existing.id);
      
      const oldGroupId = h.groupId || h.group_id;
      let newGroupId: string | undefined = undefined;

      if (oldGroupId) {
        if (groupOldToNewId[oldGroupId]) {
          newGroupId = groupOldToNewId[oldGroupId];
        } else {
          // Direct ID match
          const directMatch = nextGroups.find((eg) => eg.id === oldGroupId);
          if (directMatch) {
            newGroupId = directMatch.id;
          }
        }
      }

      if (!newGroupId && h.group) {
        // Look up by group name
        const matchedGroup = nextGroups.find(
          (eg) => eg.name.toLowerCase() === h.group.toLowerCase()
        );
        if (matchedGroup) {
          newGroupId = matchedGroup.id;
        }
      }

      nextHosts = nextHosts.map((eh) => {
        if (eh.id === existing.id) {
          return {
            ...eh,
            ip: h.ip,
            enabled: h.enabled !== false,
            groupId: newGroupId || eh.groupId,
            description: h.description || eh.description || defaultImportedDesc,
            source: "imported",
            updatedAt: now(),
          };
        }
        return eh;
      });
      hostsImported++;
    } else {
      const newId = uid();
      const oldGroupId = h.groupId || h.group_id;
      let newGroupId: string | undefined = undefined;

      if (oldGroupId) {
        if (groupOldToNewId[oldGroupId]) {
          newGroupId = groupOldToNewId[oldGroupId];
        } else {
          // Direct ID match
          const directMatch = nextGroups.find((eg) => eg.id === oldGroupId);
          if (directMatch) {
            newGroupId = directMatch.id;
          }
        }
      }

      if (!newGroupId && h.group) {
        // Look up by group name
        const matchedGroup = nextGroups.find(
          (eg) => eg.name.toLowerCase() === h.group.toLowerCase()
        );
        if (matchedGroup) {
          newGroupId = matchedGroup.id;
        }
      }

      nextHosts.push({
        id: newId,
        domain,
        ip: h.ip,
        enabled: h.enabled !== false,
        groupId: newGroupId,
        description: h.description || defaultImportedDesc,
        source: "imported",
        createdAt: h.createdAt || now(),
        updatedAt: now(),
      });
      hostOldToNewId[h.id || h.name] = newId;
      importedIds.push(newId);
      hostsImported++;
    }
  });

  // 3. Merge Profiles
  let nextProfiles = [...currentState.profiles];
  profilesData.forEach((p) => {
    if (!p.name) return;
    const existing = nextProfiles.find((ep) => ep.name.toLowerCase() === p.name.toLowerCase());
    const entryIds = p.entryIds || p.entry_ids || [];
    const importedMappedIds = entryIds
      .map((oldId: string) => {
        if (hostOldToNewId[oldId]) {
          return hostOldToNewId[oldId];
        }
        // Direct ID match
        const directMatch = nextHosts.find((eh) => eh.id === oldId);
        if (directMatch) {
          return directMatch.id;
        }
        // Lookup by domain/name match
        const nameMatch = nextHosts.find((eh) => eh.domain.toLowerCase() === oldId.toLowerCase());
        if (nameMatch) {
          return nameMatch.id;
        }
        return null;
      })
      .filter(Boolean) as string[];

    if (existing) {
      const combinedIds = Array.from(new Set([...existing.entryIds, ...importedMappedIds]));
      nextProfiles = nextProfiles.map((ep) =>
        ep.id === existing.id ? { ...existing, entryIds: combinedIds, updatedAt: now() } : ep
      );
    } else {
      const newId = uid();
      nextProfiles.push({
        id: newId,
        name: p.name,
        description: p.description || null,
        entryIds: importedMappedIds,
        active: false,
        favorite: p.favorite === true,
        createdAt: p.createdAt || now(),
        updatedAt: now(),
      });
      profilesImported++;
    }
  });

  // Add imported hosts to the active profile if requested
  const activeProfile = nextProfiles.find((p) => p.active) || nextProfiles[0];
  if (addToActiveProfile && activeProfile && importedIds.length > 0) {
    const combinedIds = Array.from(new Set([...activeProfile.entryIds, ...importedIds]));
    nextProfiles = nextProfiles.map((p) =>
      p.id === activeProfile.id ? { ...p, entryIds: combinedIds, updatedAt: now() } : p
    );
    profilesImported++;
  }

  // 4. Merge Ports
  let nextPorts = [...currentState.ports];
  portsData.forEach((p) => {
    if (!p.domain || !p.port) return;
    const existing = nextPorts.find(
      (ep) => ep.domain.toLowerCase() === p.domain.toLowerCase() && ep.port === Number(p.port)
    );
    if (!existing) {
      nextPorts.push({
        id: uid(),
        domain: p.domain,
        targetHost: p.targetHost || p.target_host || "127.0.0.1",
        port: Number(p.port),
        protocol: p.protocol === "https" ? "https" : "http",
        enabled: p.enabled !== false,
        status: p.status === "running" || p.status === "stopped" || p.status === "unknown" ? p.status : "stopped",
      });
      portsImported++;
    }
  });

  // 5. Merge Proxy Rules
  let nextProxyRules = [...currentState.proxyRules];
  proxyRulesData.forEach((r) => {
    if (!r.domain || !r.pathPrefix) return;
    const existing = nextProxyRules.find(
      (er) => er.domain.toLowerCase() === r.domain.toLowerCase() && er.pathPrefix.toLowerCase() === r.pathPrefix.toLowerCase()
    );
    if (!existing) {
      nextProxyRules.push({
        id: uid(),
        domain: r.domain,
        pathPrefix: r.pathPrefix,
        targetType: r.targetType || "local",
        targetAddress: r.targetAddress,
        customResolver: r.customResolver,
        enabled: r.enabled !== false,
        createdAt: r.createdAt || now(),
        updatedAt: now(),
      });
      proxyRulesImported++;
    }
  });

  return {
    nextHosts,
    nextGroups,
    nextProfiles,
    nextPorts,
    nextProxyRules,
    stats: {
      hostsImported,
      groupsImported,
      profilesImported,
      portsImported,
      proxyRulesImported,
    },
  };
}
