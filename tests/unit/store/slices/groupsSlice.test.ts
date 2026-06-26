import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/AppStore'

describe('groupsSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      hosts: [],
      groups: [],
      profiles: [],
      notifications: [],
    })
  })

  it('should add a group', () => {
    useAppStore.getState().addGroup({
      name: 'Test Group',
      description: 'Desc',
      color: '#00ff00',
    })

    const updated = useAppStore.getState()
    expect(updated.groups.length).toBe(1)
    expect(updated.groups[0].name).toBe('Test Group')
    expect(updated.groups[0].id).toBeDefined()
  })

  it('should add group to active profile automatically', () => {
    useAppStore.setState({
      profiles: [{
        id: 'p1',
        name: 'Profile 1',
        entryIds: [],
        groupIds: [],
        active: true,
        favorite: false,
        createdAt: '',
        updatedAt: '',
      }],
    })

    useAppStore.getState().addGroup({
      name: 'Test Group',
      description: 'Desc',
      color: '#00ff00',
    })

    const updated = useAppStore.getState()
    const newGroupId = updated.groups[0].id
    expect(updated.profiles[0].groupIds).toContain(newGroupId)
  })

  it('should delete group and cascade delete hosts when deleteAssociatedHosts is true', () => {
    useAppStore.setState({
      groups: [{ id: 'g1', name: 'Group 1', color: '#ff0000' }],
      hosts: [{
        id: 'h1',
        domain: 'domain.local',
        ip: '127.0.0.1',
        enabled: true,
        groupId: 'g1',
        source: 'manual',
        createdAt: '',
        updatedAt: '',
      }],
      profiles: [{
        id: 'p1',
        name: 'Profile 1',
        entryIds: ['h1'],
        groupIds: ['g1'],
        active: true,
        favorite: false,
        createdAt: '',
        updatedAt: '',
      }],
    })

    useAppStore.getState().deleteGroup('g1', true)

    const updated = useAppStore.getState()
    expect(updated.groups.length).toBe(0)
    expect(updated.hosts.length).toBe(0)
    expect(updated.profiles[0].groupIds).toEqual([])
    expect(updated.profiles[0].entryIds).toEqual([])
  })

  it('should delete group but unassign hosts (keep them) when deleteAssociatedHosts is false', () => {
    useAppStore.setState({
      groups: [{ id: 'g1', name: 'Group 1', color: '#ff0000' }],
      hosts: [{
        id: 'h1',
        domain: 'domain.local',
        ip: '127.0.0.1',
        enabled: true,
        groupId: 'g1',
        source: 'manual',
        createdAt: '',
        updatedAt: '',
      }],
      profiles: [{
        id: 'p1',
        name: 'Profile 1',
        entryIds: ['h1'],
        groupIds: ['g1'],
        active: true,
        favorite: false,
        createdAt: '',
        updatedAt: '',
      }],
    })

    useAppStore.getState().deleteGroup('g1', false)

    const updated = useAppStore.getState()
    expect(updated.groups.length).toBe(0)
    expect(updated.hosts.length).toBe(1)
    expect(updated.hosts[0].groupId).toBeUndefined()
    expect(updated.profiles[0].groupIds).toEqual([])
    expect(updated.profiles[0].entryIds).toContain('h1') // Entry ID is preserved
  })

  it('setHighlightedGroupId — should set and clear highlightedGroupId', () => {
    useAppStore.setState({ groups: [{ id: 'g1', name: 'G1', color: '#fff' }] })

    useAppStore.getState().setHighlightedGroupId('g1')
    expect(useAppStore.getState().highlightedGroupId).toBe('g1')

    useAppStore.getState().setHighlightedGroupId(null)
    expect(useAppStore.getState().highlightedGroupId).toBeNull()
  })

  it('updateGroup — should patch group fields', () => {
    useAppStore.setState({
      groups: [{ id: 'g1', name: 'Old Name', color: '#fff' }],
    })

    useAppStore.getState().updateGroup('g1', { name: 'New Name', color: '#000' })

    const updated = useAppStore.getState().groups[0]
    expect(updated.name).toBe('New Name')
    expect(updated.color).toBe('#000')
    expect(updated.id).toBe('g1')
  })
})
