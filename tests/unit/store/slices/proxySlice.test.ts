import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '@/store/AppStore'
import { apiAdapter } from '@/store/apiAdapter'

const baseRule = {
  domain: 'api.local',
  pathPrefix: '/api',
  targetType: 'local' as const,
  targetAddress: 'http://localhost:8080',
  customResolver: undefined,
  enabled: true,
}

describe('proxySlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      proxyRules: [],
      proxyRunningPort: null,
      caTrusted: false,
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
        portStatusAlerts: false,
        colorTheme: 'dark',
        language: 'en',
        sslEnabled: false,
        sslPort: 443,
      },
    })
    vi.clearAllMocks()
  })

  // ── CRUD ──────────────────────────────────────────────────────────────────

  it('addProxyRule — should add a rule with generated id and timestamps', () => {
    useAppStore.getState().addProxyRule(baseRule)

    const { proxyRules } = useAppStore.getState()
    expect(proxyRules).toHaveLength(1)
    expect(proxyRules[0].domain).toBe('api.local')
    expect(proxyRules[0].id).toBeDefined()
    expect(proxyRules[0].createdAt).toBeDefined()
    expect(proxyRules[0].updatedAt).toBeDefined()
  })

  it('updateProxyRule — should patch the rule and refresh updatedAt', async () => {
    useAppStore.getState().addProxyRule(baseRule)
    const { id, updatedAt: before } = useAppStore.getState().proxyRules[0]

    // small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 5))
    useAppStore.getState().updateProxyRule(id, { pathPrefix: '/v2' })

    const updated = useAppStore.getState().proxyRules[0]
    expect(updated.pathPrefix).toBe('/v2')
    expect(updated.updatedAt).not.toBe(before)
    expect(updated.domain).toBe('api.local') // unchanged
  })

  it('deleteProxyRule — should remove the rule from store', () => {
    useAppStore.getState().addProxyRule(baseRule)
    const id = useAppStore.getState().proxyRules[0].id

    useAppStore.getState().deleteProxyRule(id)

    expect(useAppStore.getState().proxyRules).toHaveLength(0)
  })

  // ── startProxyServer ──────────────────────────────────────────────────────

  it('startProxyServer — success → sets proxyRunningPort + notification', async () => {
    vi.mocked(apiAdapter.startProxyServer).mockResolvedValueOnce(undefined)

    await useAppStore.getState().startProxyServer(8080)

    expect(useAppStore.getState().proxyRunningPort).toBe(8080)
    const notifs = useAppStore.getState().notifications
    expect(notifs.length).toBeGreaterThan(0)
    expect(notifs[0].type).toBe('success')
  })

  it('startProxyServer — error → adds error notification and rethrows', async () => {
    vi.mocked(apiAdapter.startProxyServer).mockRejectedValueOnce(new Error('Port in use'))

    await expect(useAppStore.getState().startProxyServer(8080)).rejects.toThrow('Port in use')

    const notifs = useAppStore.getState().notifications
    expect(notifs.length).toBeGreaterThan(0)
    expect(notifs[0].type).toBe('error')
    // port should not be set
    expect(useAppStore.getState().proxyRunningPort).toBeNull()
  })

  // ── stopProxyServer ───────────────────────────────────────────────────────

  it('stopProxyServer — success → sets proxyRunningPort to null + notification', async () => {
    useAppStore.setState({ proxyRunningPort: 8080 })
    vi.mocked(apiAdapter.stopProxyServer).mockResolvedValueOnce(undefined)

    await useAppStore.getState().stopProxyServer()

    expect(useAppStore.getState().proxyRunningPort).toBeNull()
    const notifs = useAppStore.getState().notifications
    expect(notifs.length).toBeGreaterThan(0)
    expect(notifs[0].type).toBe('info')
  })

  it('stopProxyServer — error → rethrows', async () => {
    vi.mocked(apiAdapter.stopProxyServer).mockRejectedValueOnce(new Error('Stop failed'))

    await expect(useAppStore.getState().stopProxyServer()).rejects.toThrow('Stop failed')
  })

  // ── checkProxyStatus ──────────────────────────────────────────────────────

  it('checkProxyStatus — sets proxyRunningPort from apiAdapter', async () => {
    vi.mocked(apiAdapter.getProxyStatus).mockResolvedValueOnce(9090)

    await useAppStore.getState().checkProxyStatus()

    expect(useAppStore.getState().proxyRunningPort).toBe(9090)
  })

  it('checkProxyStatus — sets null when not running', async () => {
    vi.mocked(apiAdapter.getProxyStatus).mockResolvedValueOnce(null)

    await useAppStore.getState().checkProxyStatus()

    expect(useAppStore.getState().proxyRunningPort).toBeNull()
  })

  it('checkProxyStatus — error → does not throw', async () => {
    vi.mocked(apiAdapter.getProxyStatus).mockRejectedValueOnce(new Error('Unavailable'))

    await expect(useAppStore.getState().checkProxyStatus()).resolves.not.toThrow()
  })

  // ── checkCaStatus ─────────────────────────────────────────────────────────

  it('checkCaStatus — sets caTrusted=true when trusted', async () => {
    vi.mocked(apiAdapter.checkCaStatus).mockResolvedValueOnce(true)

    await useAppStore.getState().checkCaStatus()

    expect(useAppStore.getState().caTrusted).toBe(true)
  })

  it('checkCaStatus — sets caTrusted=false when not trusted', async () => {
    useAppStore.setState({ caTrusted: true })
    vi.mocked(apiAdapter.checkCaStatus).mockResolvedValueOnce(false)

    await useAppStore.getState().checkCaStatus()

    expect(useAppStore.getState().caTrusted).toBe(false)
  })

  it('checkCaStatus — error → does not throw', async () => {
    vi.mocked(apiAdapter.checkCaStatus).mockRejectedValueOnce(new Error('CA check failed'))

    await expect(useAppStore.getState().checkCaStatus()).resolves.not.toThrow()
  })

  // ── installRootCa ─────────────────────────────────────────────────────────

  it('installRootCa — success → caTrusted=true + success notification', async () => {
    vi.mocked(apiAdapter.installRootCa).mockResolvedValueOnce(undefined)

    await useAppStore.getState().installRootCa()

    expect(useAppStore.getState().caTrusted).toBe(true)
    const notifs = useAppStore.getState().notifications
    expect(notifs.length).toBeGreaterThan(0)
    expect(notifs[0].type).toBe('success')
  })

  it('installRootCa — error → error notification + rethrows', async () => {
    vi.mocked(apiAdapter.installRootCa).mockRejectedValueOnce(new Error('Permission denied'))

    await expect(useAppStore.getState().installRootCa()).rejects.toThrow('Permission denied')

    const notifs = useAppStore.getState().notifications
    expect(notifs.length).toBeGreaterThan(0)
    expect(notifs[0].type).toBe('error')
    expect(useAppStore.getState().caTrusted).toBe(false)
  })
})
