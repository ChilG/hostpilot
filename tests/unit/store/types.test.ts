import { describe, it, expect } from 'vitest'
import { isHostInProfile, getProfileHosts, type HostProfile, type HostEntry } from '@/store/types'

const mockProfile = (id: string, entryIds: string[], groupIds: string[]): HostProfile => ({
  id,
  name: `Profile ${id}`,
  description: 'Test',
  entryIds,
  groupIds,
  active: false,
  favorite: false,
  createdAt: '',
  updatedAt: '',
})

const mockHost = (id: string, groupId?: string): HostEntry => ({
  id,
  domain: `domain-${id}.local`,
  ip: '127.0.0.1',
  enabled: true,
  groupId,
  source: 'manual',
  createdAt: '',
  updatedAt: '',
})

describe('isHostInProfile', () => {
  it('should return true if host id is directly in entryIds', () => {
    const profile = mockProfile('p1', ['h1', 'h2'], [])
    const host = mockHost('h1')
    expect(isHostInProfile(profile, host)).toBe(true)
  })

  it('should return false if host id is not in entryIds or groupIds', () => {
    const profile = mockProfile('p1', ['h1'], [])
    const host = mockHost('h2')
    expect(isHostInProfile(profile, host)).toBe(false)
  })

  it('should return true if host belongs to a group in groupIds', () => {
    const profile = mockProfile('p1', [], ['g1'])
    const host = mockHost('h1', 'g1')
    expect(isHostInProfile(profile, host)).toBe(true)
  })

  it('should return false if host belongs to a group not in groupIds', () => {
    const profile = mockProfile('p1', [], ['g1'])
    const host = mockHost('h1', 'g2')
    expect(isHostInProfile(profile, host)).toBe(false)
  })

  it('should return false if profile is null or undefined', () => {
    const host = mockHost('h1')
    expect(isHostInProfile(null, host)).toBe(false)
    expect(isHostInProfile(undefined, host)).toBe(false)
  })
})

describe('getProfileHosts', () => {
  it('should return empty list if profile is null', () => {
    const hosts = [mockHost('h1')]
    expect(getProfileHosts(null, hosts)).toEqual([])
  })

  it('should return only hosts belonging to the profile', () => {
    const profile = mockProfile('p1', ['h1'], ['g2'])
    const hosts = [
      mockHost('h1'),       // Direct entry
      mockHost('h2'),       // Unmatched
      mockHost('h3', 'g2'), // Group entry
      mockHost('h4', 'g3'), // Unmatched group
    ]
    const result = getProfileHosts(profile, hosts)
    expect(result.map(h => h.id)).toEqual(['h1', 'h3'])
  })
})
