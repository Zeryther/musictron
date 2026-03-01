import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
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

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme: Theme) => {
        applyTheme(theme)
        set({ theme })
      },
    }),
    {
      name: 'musictron-theme',
      onRehydrateStorage: () => (state) => {
        // Apply the persisted theme on hydration
        if (state) {
          applyTheme(state.theme)
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
  const { theme } = useThemeStore.getState()
  applyTheme(theme)

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
