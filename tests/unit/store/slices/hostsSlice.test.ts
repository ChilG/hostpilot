import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/AppStore'

describe('hostsSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      hosts: [],
      groups: [],
      profiles: [],
      notifications: [],
    })
  })

  it('should add a host entry', () => {
    const store = useAppStore.getState()
    store.addHost({
      domain: 'test.local',
      ip: '127.0.0.1',
      enabled: true,
      source: 'manual',
    })

    const updated = useAppStore.getState()
    expect(updated.hosts.length).toBe(1)
    expect(updated.hosts[0].domain).toBe('test.local')
    expect(updated.hosts[0].id).toBeDefined()
  })

  it('should update a host entry', () => {
    const store = useAppStore.getState()
    useAppStore.setState({
      hosts: [{
        id: 'h1',
        domain: 'old.local',
        ip: '127.0.0.1',
        enabled: true,
        source: 'manual',
        createdAt: '',
        updatedAt: '',
      }],
    })

    useAppStore.getState().updateHost('h1', { domain: 'new.local', enabled: false })

    const updated = useAppStore.getState()
    expect(updated.hosts[0].domain).toBe('new.local')
    expect(updated.hosts[0].enabled).toBe(false)
  })

  it('should delete a host entry and cascade delete from active profile', () => {
    useAppStore.setState({
      hosts: [{
        id: 'h1',
        domain: 'test.local',
        ip: '127.0.0.1',
        enabled: true,
        source: 'manual',
        createdAt: '',
        updatedAt: '',
      }],
      profiles: [{
        id: 'p1',
        name: 'Profile 1',
        entryIds: ['h1'],
        groupIds: [],
        active: true,
        favorite: false,
        createdAt: '',
        updatedAt: '',
      }],
    })

    useAppStore.getState().deleteHost('h1')

    const updated = useAppStore.getState()
    expect(updated.hosts.length).toBe(0)
    expect(updated.profiles[0].entryIds).toEqual([])
  })

  it('should toggle hosts by group', () => {
    useAppStore.setState({
      hosts: [
        {
          id: 'h1',
          domain: 'h1.local',
          ip: '127.0.0.1',
          enabled: true,
          groupId: 'g1',
          source: 'manual',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'h2',
          domain: 'h2.local',
          ip: '127.0.0.2',
          enabled: true,
          groupId: 'g2',
          source: 'manual',
          createdAt: '',
          updatedAt: '',
        },
      ],
    })

    useAppStore.getState().toggleGroupHosts('g1', false)

    const updated = useAppStore.getState()
    expect(updated.hosts.find(h => h.id === 'h1')?.enabled).toBe(false)
    expect(updated.hosts.find(h => h.id === 'h2')?.enabled).toBe(true)
  })

  it('should enable and disable all hosts', () => {
    useAppStore.setState({
      hosts: [
        {
          id: 'h1',
          domain: 'h1.local',
          ip: '127.0.0.1',
          enabled: false,
          source: 'manual',
          createdAt: '',
          updatedAt: '',
        },
      ],
    })

    useAppStore.getState().enableAllHosts()
    expect(useAppStore.getState().hosts[0].enabled).toBe(true)

    useAppStore.getState().disableAllHosts()
    expect(useAppStore.getState().hosts[0].enabled).toBe(false)
  })

  it('addHost — should NOT auto-add to entryIds if host groupId is already in active profile groupIds', () => {
    useAppStore.setState({
      profiles: [{
        id: 'p1',
        name: 'Profile 1',
        entryIds: [],
        groupIds: ['g1'], // g1 already covered
        active: true,
        favorite: false,
        createdAt: '',
        updatedAt: '',
      }],
    })

    useAppStore.getState().addHost({
      domain: 'covered.local',
      ip: '10.0.0.1',
      enabled: true,
      groupId: 'g1', // same group as active profile
      source: 'manual',
    })

    const { profiles } = useAppStore.getState()
    // entryIds should remain empty — covered by groupIds
    expect(profiles[0].entryIds).toEqual([])
    expect(profiles[0].groupIds).toContain('g1')
  })

  it('addHost — should auto-add to entryIds when no active profile has its group', () => {
    useAppStore.setState({
      profiles: [{
        id: 'p1',
        name: 'Profile 1',
        entryIds: [],
        groupIds: ['g2'], // different group
        active: true,
        favorite: false,
        createdAt: '',
        updatedAt: '',
      }],
    })

    useAppStore.getState().addHost({
      domain: 'new.local',
      ip: '10.0.0.2',
      enabled: true,
      groupId: 'g1', // not in active profile groupIds
      source: 'manual',
    })

    const { profiles, hosts } = useAppStore.getState()
    expect(profiles[0].entryIds).toContain(hosts[0].id)
  })
})
