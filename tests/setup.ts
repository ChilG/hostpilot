import '@testing-library/jest-dom'

// Set isTauri = false for unit tests
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: undefined,
  writable: true,
})

// Mock the apiAdapter
vi.mock('@/store/apiAdapter', () => ({
  apiAdapter: {
    loadAppConfig: vi.fn().mockResolvedValue(null),
    saveAppConfig: vi.fn().mockResolvedValue(undefined),
    getProxyStatus: vi.fn().mockResolvedValue(null),
    checkCaStatus: vi.fn().mockResolvedValue(false),
    getDefaultHostsPath: vi.fn().mockResolvedValue('/etc/hosts'),
    getDefaultBackupsPath: vi.fn().mockResolvedValue('~/.hostpilot/backups'),
    getSystemLocale: vi.fn().mockResolvedValue('en'),
    checkPort: vi.fn().mockResolvedValue(false),
    startProxyServer: vi.fn().mockResolvedValue(undefined),
    stopProxyServer: vi.fn().mockResolvedValue(undefined),
    installRootCa: vi.fn().mockResolvedValue(undefined),
    backupHostsFile: vi.fn().mockImplementation((reason: string) => Promise.resolve({
      id: 'b_1',
      createdAt: new Date().toISOString(),
      reason,
      size: '1 KB'
    })),
    deleteBackupFile: vi.fn().mockResolvedValue(undefined),
    restoreBackup: vi.fn().mockResolvedValue(undefined),
    resolveDynamicHost: vi.fn().mockResolvedValue('resolved.local'),
  },
}))
