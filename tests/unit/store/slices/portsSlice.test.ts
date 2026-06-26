import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '@/store/AppStore'
import { apiAdapter } from '@/store/apiAdapter'

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

import { toast } from 'sonner'

const basePort = {
  domain: 'myapp.local',
  targetHost: '127.0.0.1',
  port: 3000,
  protocol: 'http' as const,
  enabled: true,
  status: 'unknown' as const,
}

describe('portsSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      ports: [],
      notifications: [],
      settings: {
        hostsPath: '/etc/hosts',
        previewBeforeApply: true,
        backupBeforeWrite: true,
        validateBeforeWrite: true,
        backupDirectory: '',
        keepBackupsCount: 5,
        autoCleanupBackups: true,
        showApplyNotifications: true,
        showErrorAlerts: true,
        portStatusAlerts: true,
        colorTheme: 'dark',
        language: 'en',
        sslEnabled: false,
        sslPort: 443,
      },
    })
    vi.clearAllMocks()
  })

  // ── CRUD ──────────────────────────────────────────────────────────────────

  it('addPort — should add a port rule to the store', () => {
    useAppStore.getState().addPort(basePort)

    const { ports } = useAppStore.getState()
    expect(ports.length).toBe(1)
    expect(ports[0].domain).toBe('myapp.local')
    expect(ports[0].port).toBe(3000)
    expect(ports[0].id).toBeDefined()
  })

  it('updatePort — should patch an existing port rule', () => {
    useAppStore.getState().addPort(basePort)
    const id = useAppStore.getState().ports[0].id

    useAppStore.getState().updatePort(id, { port: 4000, enabled: false })

    const updated = useAppStore.getState().ports[0]
    expect(updated.port).toBe(4000)
    expect(updated.enabled).toBe(false)
    expect(updated.domain).toBe('myapp.local') // unchanged
  })

  it('updatePort — should not affect other ports', () => {
    useAppStore.getState().addPort(basePort)
    useAppStore.getState().addPort({ ...basePort, domain: 'other.local', port: 5000 })
    const [p1, p2] = useAppStore.getState().ports

    useAppStore.getState().updatePort(p1.id, { port: 9999 })

    expect(useAppStore.getState().ports[1].id).toBe(p2.id)
    expect(useAppStore.getState().ports[1].port).toBe(5000)
  })

  it('deletePort — should remove the port from the store', () => {
    useAppStore.getState().addPort(basePort)
    const id = useAppStore.getState().ports[0].id

    useAppStore.getState().deletePort(id)

    expect(useAppStore.getState().ports).toHaveLength(0)
  })

  it('deletePort — should only remove the targeted port', () => {
    useAppStore.getState().addPort(basePort)
    useAppStore.getState().addPort({ ...basePort, domain: 'other.local', port: 5000 })
    const [p1, p2] = useAppStore.getState().ports

    useAppStore.getState().deletePort(p1.id)

    const remaining = useAppStore.getState().ports
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(p2.id)
  })

  // ── checkPortLive ─────────────────────────────────────────────────────────

  it('checkPortLive — open port → status = "running", returns true', async () => {
    useAppStore.getState().addPort(basePort)
    const id = useAppStore.getState().ports[0].id

    vi.mocked(apiAdapter.checkPort).mockResolvedValueOnce(true)

    const result = await useAppStore.getState().checkPortLive(id, '127.0.0.1', 3000)

    expect(result).toBe(true)
    expect(useAppStore.getState().ports[0].status).toBe('running')
  })

  it('checkPortLive — closed port → status = "stopped", returns false', async () => {
    useAppStore.getState().addPort(basePort)
    const id = useAppStore.getState().ports[0].id

    vi.mocked(apiAdapter.checkPort).mockResolvedValueOnce(false)

    const result = await useAppStore.getState().checkPortLive(id, '127.0.0.1', 3000)

    expect(result).toBe(false)
    expect(useAppStore.getState().ports[0].status).toBe('stopped')
  })

  it('checkPortLive — running→stopped → adds notification', async () => {
    // Start with a running port
    useAppStore.setState({
      ports: [{ ...basePort, id: 'p1', status: 'running' }],
    })

    vi.mocked(apiAdapter.checkPort).mockResolvedValueOnce(false)
    await useAppStore.getState().checkPortLive('p1', '127.0.0.1', 3000)

    const { notifications } = useAppStore.getState()
    expect(notifications.length).toBeGreaterThan(0)
    expect(notifications[0].type).toBe('error')
  })

  it('checkPortLive — running→stopped + portStatusAlerts=true → shows toast', async () => {
    useAppStore.setState({
      ports: [{ ...basePort, id: 'p1', status: 'running' }],
    })

    vi.mocked(apiAdapter.checkPort).mockResolvedValueOnce(false)
    await useAppStore.getState().checkPortLive('p1', '127.0.0.1', 3000)

    expect(toast.error).toHaveBeenCalled()
  })

  it('checkPortLive — running→stopped + portStatusAlerts=false → no toast', async () => {
    useAppStore.setState({
      ports: [{ ...basePort, id: 'p1', status: 'running' }],
      settings: {
        ...useAppStore.getState().settings,
        portStatusAlerts: false,
      },
    })

    vi.mocked(apiAdapter.checkPort).mockResolvedValueOnce(false)
    await useAppStore.getState().checkPortLive('p1', '127.0.0.1', 3000)

    expect(toast.error).not.toHaveBeenCalled()
  })

  it('checkPortLive — stopped→running → no notification (only down-alerts)', async () => {
    useAppStore.setState({
      ports: [{ ...basePort, id: 'p1', status: 'stopped' }],
    })

    vi.mocked(apiAdapter.checkPort).mockResolvedValueOnce(true)
    await useAppStore.getState().checkPortLive('p1', '127.0.0.1', 3000)

    expect(useAppStore.getState().notifications).toHaveLength(0)
  })

  it('checkPortLive — apiAdapter throws → returns false, does not throw', async () => {
    useAppStore.getState().addPort(basePort)
    const id = useAppStore.getState().ports[0].id

    vi.mocked(apiAdapter.checkPort).mockRejectedValueOnce(new Error('Network error'))

    const result = await useAppStore.getState().checkPortLive(id, '127.0.0.1', 3000)
    expect(result).toBe(false)
  })
})
