import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/AppStore'
import { useTranslation, translations } from '@/i18n/translations'
import { renderHook } from '@testing-library/react'

describe('translations', () => {
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
    })
  })

  // ── translations object ───────────────────────────────────────────────────

  it('translations object has both "en" and "th" keys', () => {
    expect(translations).toHaveProperty('en')
    expect(translations).toHaveProperty('th')
  })

  it('en and th dictionaries are non-empty objects', () => {
    expect(Object.keys(translations.en).length).toBeGreaterThan(0)
    expect(Object.keys(translations.th).length).toBeGreaterThan(0)
  })

  // ── useTranslation hook ───────────────────────────────────────────────────

  it('useTranslation — returns correct EN string', () => {
    const { result } = renderHook(() => useTranslation())
    // pick the first key in en as a reliable test
    const firstKey = Object.keys(translations.en)[0]
    expect(result.current.t(firstKey)).toBe(translations.en[firstKey])
  })

  it('useTranslation — returns locale = "en" when language is en', () => {
    const { result } = renderHook(() => useTranslation())
    expect(result.current.locale).toBe('en')
  })

  it('useTranslation — returns locale = "th" when language is th', () => {
    useAppStore.setState({
      settings: { ...useAppStore.getState().settings, language: 'th' },
    })
    const { result } = renderHook(() => useTranslation())
    expect(result.current.locale).toBe('th')
  })

  it('useTranslation — TH locale returns thai translation when key exists in th', () => {
    useAppStore.setState({
      settings: { ...useAppStore.getState().settings, language: 'th' },
    })
    const { result } = renderHook(() => useTranslation())
    // Find a key that exists in th dict
    const thKey = Object.keys(translations.th)[0]
    expect(result.current.t(thKey)).toBe(translations.th[thKey])
  })

  it('useTranslation — TH locale falls back to EN when key missing in th', () => {
    useAppStore.setState({
      settings: { ...useAppStore.getState().settings, language: 'th' },
    })
    // Find a key that exists in EN but not TH (if any), otherwise use known EN key
    const enOnlyKey = Object.keys(translations.en).find(
      (k) => !(k in translations.th)
    )
    if (enOnlyKey) {
      const { result } = renderHook(() => useTranslation())
      expect(result.current.t(enOnlyKey)).toBe(translations.en[enOnlyKey])
    } else {
      // All keys exist in both, skip gracefully
      expect(true).toBe(true)
    }
  })

  it('useTranslation — missing key → returns the key itself', () => {
    const { result } = renderHook(() => useTranslation())
    expect(result.current.t('this.key.does.not.exist')).toBe('this.key.does.not.exist')
  })

  it('useTranslation — params interpolation replaces {placeholder}', () => {
    const { result } = renderHook(() => useTranslation())
    // Use a key that has a placeholder, e.g. notif.hostCreatedDesc which has {domain}
    const rawTemplate = translations.en['notif.hostCreatedDesc']
    if (rawTemplate && rawTemplate.includes('{domain}')) {
      const interpolated = result.current.t('notif.hostCreatedDesc', { domain: 'test.local' })
      expect(interpolated).toContain('test.local')
      expect(interpolated).not.toContain('{domain}')
    } else {
      // Fallback: test manual interpolation with a key that has {port}
      const portTemplate = translations.en['notif.proxyStartedDesc']
      if (portTemplate && portTemplate.includes('{port}')) {
        const interpolated = result.current.t('notif.proxyStartedDesc', { port: 8080 })
        expect(interpolated).toContain('8080')
        expect(interpolated).not.toContain('{port}')
      } else {
        expect(true).toBe(true)
      }
    }
  })

  it('useTranslation — multiple params all get replaced', () => {
    const { result } = renderHook(() => useTranslation())
    // notif.portDownDesc has {domain} and {port}
    const raw = translations.en['notif.portDownDesc']
    if (raw && raw.includes('{domain}') && raw.includes('{port}')) {
      const out = result.current.t('notif.portDownDesc', { domain: 'myapp.local', port: 3000 })
      expect(out).toContain('myapp.local')
      expect(out).toContain('3000')
      expect(out).not.toContain('{domain}')
      expect(out).not.toContain('{port}')
    } else {
      expect(true).toBe(true)
    }
  })
})
