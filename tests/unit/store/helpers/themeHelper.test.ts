import { describe, it, expect, beforeEach, vi } from 'vitest'
import { applyThemeClass, applyLanguageClass } from '@/store/helpers/themeHelper'

describe('themeHelper', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.lang = ''
  })

  // ── applyThemeClass ───────────────────────────────────────────────────────

  it('applyThemeClass("dark") → adds "dark", removes "light"', () => {
    document.documentElement.classList.add('light')
    applyThemeClass('dark')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('applyThemeClass("light") → adds "light", removes "dark"', () => {
    document.documentElement.classList.add('dark')
    applyThemeClass('light')

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('applyThemeClass("system") with dark preference → adds "dark"', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({ matches: true, media: query, onchange: null,
        addListener: vi.fn(), removeListener: vi.fn(),
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
    })

    applyThemeClass('system')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('applyThemeClass("system") with light preference → adds "light"', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({ matches: false, media: query, onchange: null,
        addListener: vi.fn(), removeListener: vi.fn(),
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
    })

    applyThemeClass('system')

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('applyThemeClass — switching themes removes previous class', () => {
    applyThemeClass('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    applyThemeClass('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  // ── applyLanguageClass ────────────────────────────────────────────────────

  it('applyLanguageClass("th") → sets document.lang = "th"', () => {
    applyLanguageClass('th')
    expect(document.documentElement.lang).toBe('th')
  })

  it('applyLanguageClass("en") → sets document.lang = "en"', () => {
    document.documentElement.lang = 'th'
    applyLanguageClass('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
