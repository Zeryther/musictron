import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

export const UI_SCALE_OPTIONS = [0.9, 1, 1.1, 1.25] as const

interface ThemeState {
  theme: Theme
  uiScale: number
  setTheme: (theme: Theme) => void
  setUiScale: (scale: number) => void
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
}

function applyUiScale(scale: number) {
  // Scaling the root font-size scales every rem-based dimension in the app.
  const root = document.documentElement
  root.style.fontSize =
    Number.isFinite(scale) && scale !== 1 ? `${scale * 100}%` : ''
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      uiScale: 1,
      setTheme: (theme: Theme) => {
        applyTheme(theme)
        set({ theme })
      },
      setUiScale: (scale: number) => {
        applyUiScale(scale)
        set({ uiScale: scale })
      },
    }),
    {
      name: 'musictron-theme',
      onRehydrateStorage: () => (state) => {
        // Apply the persisted theme and scale on hydration
        if (state) {
          applyTheme(state.theme)
          applyUiScale(state.uiScale ?? 1)
        }
      },
    },
  ),
)

/**
 * Initialize theme — apply persisted theme and listen for system changes.
 * Call once at app startup.
 */
export function initializeTheme() {
  const { theme, uiScale } = useThemeStore.getState()
  applyTheme(theme)
  applyUiScale(uiScale ?? 1)

  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', () => {
      const current = useThemeStore.getState().theme
      if (current === 'system') {
        applyTheme('system')
      }
    })
  }
}
