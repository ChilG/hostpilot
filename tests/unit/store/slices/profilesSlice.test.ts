import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/AppStore'

describe('profilesSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      hosts: [],
      groups: [],
      profiles: [],
      notifications: [],
    })
  })

  it('should add a profile', () => {
    useAppStore.getState().addProfile({
      name: 'Work',
      description: 'Work profile',
      entryIds: ['h1'],
      groupIds: ['g1'],
      active: false,
      favorite: false,
    })

    const updated = useAppStore.getState()
    expect(updated.profiles.length).toBe(1)
    expect(updated.profiles[0].name).toBe('Work')
    expect(updated.profiles[0].entryIds).toEqual(['h1'])
  })

  it('should duplicate a profile with "Copy of" prefix', () => {
    useAppStore.setState({
      profiles: [{
        id: 'p1',
        name: 'Work',
        description: 'Work profile',
        entryIds: ['h1'],
        groupIds: ['g1'],
        active: true,
        favorite: true,
        createdAt: '',
        updatedAt: '',
      }],
    })

    useAppStore.getState().duplicateProfile('p1')

    const updated = useAppStore.getState()
    expect(updated.profiles.length).toBe(2)
    const duplicate = updated.profiles.find(p => p.id !== 'p1')
    expect(duplicate).toBeDefined()
    expect(duplicate?.name).toBe('Copy of Work')
    expect(duplicate?.active).toBe(false)
    expect(duplicate?.favorite).toBe(false)
    expect(duplicate?.entryIds).toEqual(['h1'])
    expect(duplicate?.groupIds).toEqual(['g1'])
  })

  it('should activate a profile and deactivate all other profiles', () => {
    useAppStore.setState({
      profiles: [
        {
          id: 'p1',
          name: 'P1',
          entryIds: [],
          groupIds: [],
          active: true,
          favorite: false,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'p2',
          name: 'P2',
          entryIds: [],
          groupIds: [],
          active: false,
          favorite: false,
          createdAt: '',
          updatedAt: '',
        },
      ],
    })

    useAppStore.getState().activateProfile('p2')

    const updated = useAppStore.getState()
    expect(updated.profiles.find(p => p.id === 'p1')?.active).toBe(false)
    expect(updated.profiles.find(p => p.id === 'p2')?.active).toBe(true)
  })

  it('should delete a profile', () => {
    useAppStore.setState({
      profiles: [{
        id: 'p1',
        name: 'P1',
        entryIds: [],
        groupIds: [],
        active: false,
        favorite: false,
        createdAt: '',
        updatedAt: '',
      }],
    })

    useAppStore.getState().deleteProfile('p1')

    const updated = useAppStore.getState()
    expect(updated.profiles.length).toBe(0)
  })
})
