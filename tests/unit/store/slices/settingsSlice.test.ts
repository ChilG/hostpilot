import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '@/store/AppStore'

// themeHelper uses document — jsdom provides it, but we spy on classList
describe('settingsSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
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
      onboarded: false,
    })
    // Reset root classes
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.lang = ''
  })

  // ── updateSettings ────────────────────────────────────────────────────────

  it('should patch settings fields', () => {
    useAppStore.getState().updateSettings({ hostsPath: '/tmp/hosts', sslPort: 8443 })

    const { settings } = useAppStore.getState()
    expect(settings.hostsPath).toBe('/tmp/hosts')
    expect(settings.sslPort).toBe(8443)
    expect(settings.colorTheme).toBe('dark') // unchanged
  })

  it('updateSettings colorTheme="light" → adds "light" class on <html>', () => {
    useAppStore.getState().updateSettings({ colorTheme: 'light' })

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('updateSettings colorTheme="dark" → adds "dark" class on <html>', () => {
    useAppStore.getState().updateSettings({ colorTheme: 'dark' })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('updateSettings colorTheme="system" → resolves to system preference', () => {
    // jsdom does not implement matchMedia, define it manually
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: true, // dark preference
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    })

    useAppStore.getState().updateSettings({ colorTheme: 'system' })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('updateSettings language="th" → sets document.lang="th"', () => {
    useAppStore.getState().updateSettings({ language: 'th' })

    expect(document.documentElement.lang).toBe('th')
    expect(useAppStore.getState().settings.language).toBe('th')
  })

  it('updateSettings language="en" → sets document.lang="en"', () => {
    document.documentElement.lang = 'th'
    useAppStore.getState().updateSettings({ language: 'en' })

    expect(document.documentElement.lang).toBe('en')
  })

  it('updateSettings without colorTheme/language → no DOM side-effects', () => {
    const addSpy = vi.spyOn(document.documentElement.classList, 'add')
    useAppStore.getState().updateSettings({ sslPort: 9443 })

    expect(addSpy).not.toHaveBeenCalled()
  })

  // ── setOnboardedComplete ──────────────────────────────────────────────────

  it('setOnboardedComplete — sets onboarded to true', () => {
    expect(useAppStore.getState().onboarded).toBe(false)
    useAppStore.getState().setOnboardedComplete()
    expect(useAppStore.getState().onboarded).toBe(true)
  })
})
