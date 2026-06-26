import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/AppStore'

describe('importSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      hosts: [],
      groups: [],
      profiles: [],
      notifications: [],
    })
  })

  it('should import new hosts and groups successfully', () => {
    const importData = {
      groups: [{ id: 'g_imp', name: 'Imported Group', color: '#ff00ff' }],
      hosts: [{
        id: 'h_imp',
        domain: 'imported.local',
        ip: '192.168.1.100',
        enabled: true,
        groupId: 'g_imp',
      }],
    }

    const stats = useAppStore.getState().importConfig(importData, 'skip', false)

    expect(stats.hostsImported).toBe(1)
    expect(stats.groupsImported).toBe(1)

    const updated = useAppStore.getState()
    expect(updated.hosts.length).toBe(1)
    expect(updated.hosts[0].domain).toBe('imported.local')
    expect(updated.groups.length).toBe(1)
    expect(updated.groups[0].name).toBe('Imported Group')
  })

  it('should skip duplicate domains if strategy is "skip"', () => {
    useAppStore.setState({
      hosts: [{
        id: 'h_existing',
        domain: 'dup.local',
        ip: '127.0.0.1',
        enabled: true,
        source: 'manual',
        createdAt: '',
        updatedAt: '',
      }],
    })

    const importData = {
      hosts: [{
        id: 'h_dup',
        domain: 'dup.local',
        ip: '192.168.1.5',
        enabled: true,
      }],
    }

    const stats = useAppStore.getState().importConfig(importData, 'skip', false)
    expect(stats.hostsImported).toBe(0)

    const updated = useAppStore.getState()
    expect(updated.hosts.length).toBe(1)
    expect(updated.hosts[0].ip).toBe('127.0.0.1') // skipped, not overwritten
  })

  it('should overwrite duplicate domains if strategy is "overwrite"', () => {
    useAppStore.setState({
      hosts: [{
        id: 'h_existing',
        domain: 'dup.local',
        ip: '127.0.0.1',
        enabled: true,
        source: 'manual',
        createdAt: '',
        updatedAt: '',
      }],
    })

    const importData = {
      hosts: [{
        id: 'h_dup',
        domain: 'dup.local',
        ip: '192.168.1.5',
        enabled: true,
      }],
    }

    const stats = useAppStore.getState().importConfig(importData, 'overwrite', false)
    expect(stats.hostsImported).toBe(1)

    const updated = useAppStore.getState()
    expect(updated.hosts.length).toBe(1)
    expect(updated.hosts[0].ip).toBe('192.168.1.5') // overwritten
  })

  it('should create duplicates if strategy is "duplicate"', () => {
    useAppStore.setState({
      hosts: [{
        id: 'h_existing',
        domain: 'dup.local',
        ip: '127.0.0.1',
        enabled: true,
        source: 'manual',
        createdAt: '',
        updatedAt: '',
      }],
    })

    const importData = {
      hosts: [{
        id: 'h_dup',
        domain: 'dup.local',
        ip: '192.168.1.5',
        enabled: true,
      }],
    }

    const stats = useAppStore.getState().importConfig(importData, 'duplicate', false)
    expect(stats.hostsImported).toBe(1)

    const updated = useAppStore.getState()
    expect(updated.hosts.length).toBe(2) // both are kept
  })

  it('should auto-add imported hosts to active profile if addToActiveProfile is true', () => {
    useAppStore.setState({
      profiles: [{
        id: 'p_active',
        name: 'Active Profile',
        entryIds: [],
        groupIds: [],
        active: true,
        favorite: false,
        createdAt: '',
        updatedAt: '',
      }],
    })

    const importData = {
      hosts: [{
        id: 'h_new',
        domain: 'new.local',
        ip: '10.0.0.1',
        enabled: true,
      }],
    }

    useAppStore.getState().importConfig(importData, 'skip', true)

    const updated = useAppStore.getState()
    expect(updated.profiles[0].entryIds.length).toBe(1)
  })
})
