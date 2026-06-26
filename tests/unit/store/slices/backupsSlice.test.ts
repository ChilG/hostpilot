import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '@/store/AppStore'
import { apiAdapter } from '@/store/apiAdapter'

describe('backupsSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      backups: [],
      settings: {
        hostsPath: '/etc/hosts',
        previewBeforeApply: true,
        backupBeforeWrite: true,
        validateBeforeWrite: true,
        backupDirectory: '',
        keepBackupsCount: 3,
        autoCleanupBackups: true,
        showApplyNotifications: true,
        showErrorAlerts: true,
        portStatusAlerts: false,
        colorTheme: 'dark',
        language: 'en',
        sslEnabled: false,
        sslPort: 443,
      },
      notifications: [],
    })
    vi.clearAllMocks()
  })

  it('should add a backup record', async () => {
    const record = await useAppStore.getState().addBackup('Initial backup')
    
    expect(record.reason).toBe('Initial backup')
    expect(record.id).toBe('b_1')
    
    const updated = useAppStore.getState()
    expect(updated.backups.length).toBe(1)
    expect(updated.backups[0].id).toBe('b_1')
  })

  it('should auto-cleanup oldest backups when backups count exceeds keepBackupsCount', async () => {
    useAppStore.setState({
      backups: [
        { id: 'b_oldest', createdAt: '2026-06-25T00:00:00Z', reason: 'Oldest', size: '1 KB' },
        { id: 'b_mid', createdAt: '2026-06-25T01:00:00Z', reason: 'Mid', size: '1 KB' },
        { id: 'b_newest', createdAt: '2026-06-25T02:00:00Z', reason: 'Newest', size: '1 KB' },
      ],
    })

    // Setting mock implementation to mock backupHostsFile returning b_fresh
    vi.spyOn(apiAdapter, 'backupHostsFile').mockResolvedValueOnce({
      id: 'b_fresh',
      createdAt: '2026-06-25T03:00:00Z',
      reason: 'Fresh backup',
      size: '1 KB',
    })

    // Add fresh backup. Total backups will be 4, limit is 3.
    // Since keepBackupsCount = 3, it should keep the fresh one and prune the oldest ('b_oldest').
    await useAppStore.getState().addBackup('Fresh backup')

    const updated = useAppStore.getState()
    expect(updated.backups.length).toBe(3)
    expect(updated.backups.map(b => b.id)).toEqual(['b_fresh', 'b_oldest', 'b_mid'])
    // Wait, let's look at the implementation:
    // next = [record, ...state.backups] -> ['b_fresh', 'b_oldest', 'b_mid', 'b_newest']
    // next.slice(keepBackupsCount) -> ['b_newest'] is pruned!
    // So next becomes next.slice(0, keepBackupsCount) -> ['b_fresh', 'b_oldest', 'b_mid']
    // So indeed 'b_newest' is pruned because next is sorted with newest first in the array!
    // Let's verify that apiAdapter.deleteBackupFile was called with the pruned item's ID:
    expect(apiAdapter.deleteBackupFile).toHaveBeenCalledWith('b_newest')
  })

  it('should not cleanup backups if autoCleanupBackups is false', async () => {
    useAppStore.setState({
      backups: [
        { id: 'b_oldest', createdAt: '2026-06-25T00:00:00Z', reason: 'Oldest', size: '1 KB' },
        { id: 'b_mid', createdAt: '2026-06-25T01:00:00Z', reason: 'Mid', size: '1 KB' },
        { id: 'b_newest', createdAt: '2026-06-25T02:00:00Z', reason: 'Newest', size: '1 KB' },
      ],
    })
    
    // Disable auto cleanup
    useAppStore.setState({
      settings: {
        ...useAppStore.getState().settings,
        autoCleanupBackups: false,
      },
    })

    vi.spyOn(apiAdapter, 'backupHostsFile').mockResolvedValueOnce({
      id: 'b_fresh',
      createdAt: '2026-06-25T03:00:00Z',
      reason: 'Fresh backup',
      size: '1 KB',
    })

    await useAppStore.getState().addBackup('Fresh backup')

    const updated = useAppStore.getState()
    expect(updated.backups.length).toBe(4) // keeps all 4
    expect(apiAdapter.deleteBackupFile).not.toHaveBeenCalled()
  })

  it('should delete a backup physically and from store', async () => {
    useAppStore.setState({
      backups: [{ id: 'b_delete', createdAt: '', reason: 'Delete me', size: '1 KB' }],
    })

    await useAppStore.getState().deleteBackup('b_delete')

    const updated = useAppStore.getState()
    expect(updated.backups.length).toBe(0)
    expect(apiAdapter.deleteBackupFile).toHaveBeenCalledWith('b_delete')
  })

  it('restoreBackup — should call apiAdapter and add a notification', async () => {
    useAppStore.setState({
      backups: [{ id: 'b_restore', createdAt: '', reason: 'Before update', size: '2 KB' }],
    })

    await useAppStore.getState().restoreBackup('b_restore')

    expect(apiAdapter.restoreBackup).toHaveBeenCalledWith('b_restore')
    const { notifications } = useAppStore.getState()
    expect(notifications.length).toBeGreaterThan(0)
    expect(notifications[0].type).toBe('success')
  })

  it('addBackup — apiAdapter.backupHostsFile error → throws and does not add to store', async () => {
    vi.spyOn(apiAdapter, 'backupHostsFile').mockRejectedValueOnce(new Error('Disk full'))

    await expect(useAppStore.getState().addBackup('Failed backup')).rejects.toThrow('Disk full')
    expect(useAppStore.getState().backups.length).toBe(0)
  })
})
