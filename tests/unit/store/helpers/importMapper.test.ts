import { describe, it, expect } from 'vitest'
import { mergeImportedConfig, type CurrentStoreState } from '@/store/helpers/importMapper'

let _id = 0
const uid = () => `id_${++_id}`
const now = () => '2026-01-01T00:00:00Z'

const emptyState = (): CurrentStoreState => ({
  hosts: [],
  groups: [],
  profiles: [],
  ports: [],
  proxyRules: [],
})

describe('mergeImportedConfig — importMapper', () => {
  // ── Groups ────────────────────────────────────────────────────────────────

  it('imports new groups and assigns new IDs', () => {
    const result = mergeImportedConfig(
      { groups: [{ id: 'old_g', name: 'Dev Group', color: 'blue' }] },
      emptyState(), uid, now, 'Imported'
    )
    expect(result.nextGroups).toHaveLength(1)
    expect(result.nextGroups[0].name).toBe('Dev Group')
    expect(result.nextGroups[0].id).not.toBe('old_g') // new ID assigned
    expect(result.stats.groupsImported).toBe(1)
  })

  it('skips duplicate groups (by name) and maps old ID to existing ID', () => {
    const state = emptyState()
    state.groups = [{ id: 'existing_g', name: 'Dev Group', color: 'red' }]

    const result = mergeImportedConfig(
      { groups: [{ id: 'old_g', name: 'Dev Group', color: 'blue' }] },
      state, uid, now, 'Imported'
    )
    expect(result.nextGroups).toHaveLength(1)
    expect(result.nextGroups[0].id).toBe('existing_g') // unchanged
    expect(result.stats.groupsImported).toBe(0)
  })

  // ── Hosts — skip strategy ─────────────────────────────────────────────────

  it('skip strategy — does not change existing host', () => {
    const state = emptyState()
    state.hosts = [{
      id: 'h1', domain: 'app.local', ip: '127.0.0.1', enabled: true,
      source: 'manual', createdAt: now(), updatedAt: now(),
    }]

    const result = mergeImportedConfig(
      { hosts: [{ id: 'h_new', domain: 'app.local', ip: '10.0.0.5', enabled: true }] },
      state, uid, now, 'Imported', 'skip'
    )
    expect(result.nextHosts).toHaveLength(1)
    expect(result.nextHosts[0].ip).toBe('127.0.0.1') // unchanged
    expect(result.stats.hostsImported).toBe(0)
  })

  // ── Hosts — overwrite strategy ────────────────────────────────────────────

  it('overwrite strategy — updates existing host fields', () => {
    const state = emptyState()
    state.hosts = [{
      id: 'h1', domain: 'app.local', ip: '127.0.0.1', enabled: true,
      source: 'manual', createdAt: now(), updatedAt: now(),
    }]

    const result = mergeImportedConfig(
      { hosts: [{ id: 'h_imp', domain: 'app.local', ip: '10.0.0.5', enabled: false }] },
      state, uid, now, 'Imported', 'overwrite'
    )
    expect(result.nextHosts).toHaveLength(1)
    expect(result.nextHosts[0].ip).toBe('10.0.0.5')
    expect(result.nextHosts[0].enabled).toBe(false)
    expect(result.stats.hostsImported).toBe(1)
  })

  it('overwrite strategy — maps groupId via group name lookup', () => {
    const state = emptyState()
    state.hosts = [{
      id: 'h1', domain: 'app.local', ip: '127.0.0.1', enabled: true,
      source: 'manual', createdAt: now(), updatedAt: now(),
    }]
    state.groups = [{ id: 'g_local', name: 'Backend', color: 'green' }]

    const result = mergeImportedConfig(
      {
        hosts: [{
          id: 'h_imp', domain: 'app.local', ip: '10.0.0.5',
          enabled: true, group: 'Backend',
        }]
      },
      state, uid, now, 'Imported', 'overwrite'
    )
    expect(result.nextHosts[0].groupId).toBe('g_local')
  })

  // ── Hosts — duplicate strategy ────────────────────────────────────────────

  it('duplicate strategy — creates a new entry alongside existing', () => {
    const state = emptyState()
    state.hosts = [{
      id: 'h1', domain: 'app.local', ip: '127.0.0.1', enabled: true,
      source: 'manual', createdAt: now(), updatedAt: now(),
    }]

    const result = mergeImportedConfig(
      { hosts: [{ id: 'h_imp', domain: 'app.local', ip: '10.0.0.5', enabled: true }] },
      state, uid, now, 'Imported', 'duplicate'
    )
    expect(result.nextHosts).toHaveLength(2)
    expect(result.stats.hostsImported).toBe(1)
  })

  it('skips hosts with missing domain or ip', () => {
    const result = mergeImportedConfig(
      {
        hosts: [
          { id: 'h1', domain: '', ip: '127.0.0.1', enabled: true },
          { id: 'h2', domain: 'valid.local', ip: '', enabled: true },
        ]
      },
      emptyState(), uid, now, 'Imported'
    )
    expect(result.nextHosts).toHaveLength(0)
  })

  // ── Profiles ──────────────────────────────────────────────────────────────

  it('imports new profiles and maps entryIds to new host IDs', () => {
    const result = mergeImportedConfig(
      {
        hosts: [{ id: 'h_old', domain: 'api.local', ip: '10.0.0.1', enabled: true }],
        profiles: [{
          id: 'p_old', name: 'Dev Profile',
          entryIds: ['h_old'], groupIds: [],
        }],
      },
      emptyState(), uid, now, 'Imported'
    )
    expect(result.nextProfiles).toHaveLength(1)
    expect(result.nextProfiles[0].name).toBe('Dev Profile')
    const newHostId = result.nextHosts[0].id
    expect(result.nextProfiles[0].entryIds).toContain(newHostId)
    expect(result.stats.profilesImported).toBe(1)
  })

  it('merges into existing profile (combines entryIds)', () => {
    const state = emptyState()
    state.hosts = [{
      id: 'h_existing', domain: 'existing.local', ip: '1.2.3.4', enabled: true,
      source: 'manual', createdAt: now(), updatedAt: now(),
    }]
    state.profiles = [{
      id: 'p1', name: 'Dev Profile', entryIds: ['h_existing'], groupIds: [],
      active: false, favorite: false, createdAt: now(), updatedAt: now(),
    }]

    const result = mergeImportedConfig(
      {
        hosts: [{ id: 'h_new', domain: 'new.local', ip: '5.6.7.8', enabled: true }],
        profiles: [{
          id: 'p_old', name: 'Dev Profile',
          entryIds: ['h_new'], groupIds: [],
        }],
      },
      state, uid, now, 'Imported'
    )
    const profile = result.nextProfiles.find(p => p.name === 'Dev Profile')!
    expect(profile.entryIds).toContain('h_existing')
    const newHostId = result.nextHosts.find(h => h.domain === 'new.local')!.id
    expect(profile.entryIds).toContain(newHostId)
  })

  it('addToActiveProfile — adds imported hosts to active profile entryIds', () => {
    const state = emptyState()
    state.profiles = [{
      id: 'p_active', name: 'Active', entryIds: [], groupIds: [],
      active: true, favorite: false, createdAt: now(), updatedAt: now(),
    }]

    const result = mergeImportedConfig(
      { hosts: [{ id: 'h1', domain: 'new.local', ip: '10.0.0.1', enabled: true }] },
      state, uid, now, 'Imported', 'skip', true
    )
    const active = result.nextProfiles.find(p => p.active)!
    expect(active.entryIds).toHaveLength(1)
  })

  // ── Ports ─────────────────────────────────────────────────────────────────

  it('imports new port rules', () => {
    const result = mergeImportedConfig(
      {
        ports: [{
          id: 'p1', domain: 'api.local', port: 3000,
          targetHost: '127.0.0.1', protocol: 'http', enabled: true,
        }]
      },
      emptyState(), uid, now, 'Imported'
    )
    expect(result.nextPorts).toHaveLength(1)
    expect(result.nextPorts[0].port).toBe(3000)
    expect(result.stats.portsImported).toBe(1)
  })

  it('skips duplicate port rules (same domain + port)', () => {
    const state = emptyState()
    state.ports = [{
      id: 'p_existing', domain: 'api.local', port: 3000,
      targetHost: '127.0.0.1', protocol: 'http', enabled: true, status: 'unknown',
    }]

    const result = mergeImportedConfig(
      {
        ports: [{
          id: 'p_new', domain: 'api.local', port: 3000,
          targetHost: '0.0.0.0', protocol: 'https', enabled: true,
        }]
      },
      state, uid, now, 'Imported'
    )
    expect(result.nextPorts).toHaveLength(1)
    expect(result.nextPorts[0].id).toBe('p_existing') // existing kept
    expect(result.stats.portsImported).toBe(0)
  })

  it('skips ports without domain or port number', () => {
    const result = mergeImportedConfig(
      {
        ports: [
          { id: 'p1', domain: '', port: 3000 },
          { id: 'p2', domain: 'api.local', port: 0 },
        ]
      },
      emptyState(), uid, now, 'Imported'
    )
    expect(result.nextPorts).toHaveLength(0)
  })

  // ── Proxy Rules ───────────────────────────────────────────────────────────

  it('imports new proxy rules', () => {
    const result = mergeImportedConfig(
      {
        proxyRules: [{
          id: 'r1', domain: 'api.local', pathPrefix: '/api',
          targetType: 'local', targetAddress: 'http://localhost:8080', enabled: true,
        }]
      },
      emptyState(), uid, now, 'Imported'
    )
    expect(result.nextProxyRules).toHaveLength(1)
    expect(result.nextProxyRules[0].pathPrefix).toBe('/api')
    expect(result.stats.proxyRulesImported).toBe(1)
  })

  it('skips duplicate proxy rules (same domain + pathPrefix)', () => {
    const state = emptyState()
    state.proxyRules = [{
      id: 'r_existing', domain: 'api.local', pathPrefix: '/api',
      targetType: 'local', targetAddress: 'http://localhost:8080',
      enabled: true, createdAt: now(), updatedAt: now(),
    }]

    const result = mergeImportedConfig(
      {
        proxyRules: [{
          id: 'r_new', domain: 'api.local', pathPrefix: '/api',
          targetType: 'local', targetAddress: 'http://localhost:9000', enabled: true,
        }]
      },
      state, uid, now, 'Imported'
    )
    expect(result.nextProxyRules).toHaveLength(1)
    expect(result.nextProxyRules[0].id).toBe('r_existing')
    expect(result.stats.proxyRulesImported).toBe(0)
  })

  it('skips proxy rules without domain or pathPrefix', () => {
    const result = mergeImportedConfig(
      {
        proxyRules: [
          { id: 'r1', domain: '', pathPrefix: '/api' },
          { id: 'r2', domain: 'api.local', pathPrefix: '' },
        ]
      },
      emptyState(), uid, now, 'Imported'
    )
    expect(result.nextProxyRules).toHaveLength(0)
  })

  // ── stats ─────────────────────────────────────────────────────────────────

  it('returns accurate stats for a full import', () => {
    const result = mergeImportedConfig(
      {
        groups: [{ id: 'g1', name: 'G1', color: 'blue' }],
        hosts: [{ id: 'h1', domain: 'a.local', ip: '1.1.1.1', enabled: true }],
        ports: [{ id: 'p1', domain: 'a.local', port: 80, targetHost: '127.0.0.1' }],
        proxyRules: [{ id: 'r1', domain: 'a.local', pathPrefix: '/api', targetType: 'local', targetAddress: 'http://localhost:8080' }],
      },
      emptyState(), uid, now, 'Imported'
    )
    expect(result.stats.groupsImported).toBe(1)
    expect(result.stats.hostsImported).toBe(1)
    expect(result.stats.portsImported).toBe(1)
    expect(result.stats.proxyRulesImported).toBe(1)
  })
})
