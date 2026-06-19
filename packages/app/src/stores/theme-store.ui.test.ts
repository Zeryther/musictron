import { afterEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from '@/stores/theme-store'
import { autoResetStores } from '@/test/store'

autoResetStores(useThemeStore)

afterEach(() => {
  document.documentElement.classList.remove('dark', 'light')
})

describe('useThemeStore.setTheme', () => {
  it('applies the dark class', () => {
    useThemeStore.getState().setTheme('dark')

    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement).not.toHaveClass('light')
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('applies the light class', () => {
    useThemeStore.getState().setTheme('light')

    expect(document.documentElement).toHaveClass('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('resolves "system" via prefers-color-scheme', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      })),
    )

    useThemeStore.getState().setTheme('system')

    expect(document.documentElement).toHaveClass('dark')
    expect(useThemeStore.getState().theme).toBe('system')
  })
})
