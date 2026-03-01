import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { configureMusicKit, getMusicKitInstance } from '@/lib/musickit'
import { getAppConfig } from '@/lib/platform'

interface AuthState {
  isAuthorized: boolean
  isLoading: boolean
  developerToken: string
  musicUserToken: string | null
  error: string | null
  serverUrl: string
  serverConfigured: boolean | null // null = unknown
  tokenSource: 'server' | 'manual' | 'none'

  setDeveloperToken: (token: string) => void
  setServerUrl: (url: string) => void
  initialize: () => Promise<void>
  authorize: () => Promise<void>
  signOut: () => Promise<void>
  fetchTokenFromServer: () => Promise<string | null>
  checkServer: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthorized: false,
      isLoading: false,
      developerToken: '',
      musicUserToken: null,
      error: null,
      serverUrl: '',
      serverConfigured: null,
      tokenSource: 'none',

      setDeveloperToken: (token: string) => {
        set({ developerToken: token, tokenSource: 'manual' })
      },

      setServerUrl: (url: string) => {
        set({ serverUrl: url, serverConfigured: null })
      },

      checkServer: async () => {
        const { serverUrl } = get()
        try {
          const res = await fetch(`${serverUrl}/api/health`, {
            signal: AbortSignal.timeout(5000),
          })
          if (!res.ok) {
            set({ serverConfigured: false })
            return false
          }
          const data = await res.json()
          const configured = data.configured === true
          set({ serverConfigured: configured })
          return configured
        } catch {
          set({ serverConfigured: false })
          return false
        }
      },

      fetchTokenFromServer: async () => {
        const { serverUrl } = get()
        try {
          const res = await fetch(`${serverUrl}/api/token`, {
            signal: AbortSignal.timeout(10000),
          })
          if (!res.ok) return null
          const data = await res.json()
          if (data.token) {
            set({ developerToken: data.token, tokenSource: 'server' })
            return data.token
          }
          return null
        } catch {
          return null
        }
      },

      initialize: async () => {
        set({ isLoading: true, error: null })

        // Hydrate defaults from AppConfig on first run.
        // If the store already has persisted values, those take precedence.
        const config = getAppConfig()
        const state = get()

        if (!state.serverUrl) {
          set({ serverUrl: config.serverUrl })
        }
        if (!state.developerToken && config.developerToken) {
          set({ developerToken: config.developerToken })
        }

        let token = get().developerToken

        // Step 1: If we don't have a token, try the server
        if (!token) {
          const serverOk = await get().checkServer()
          if (serverOk) {
            token = (await get().fetchTokenFromServer()) || ''
          }
        }

        // Step 2: If we still don't have a token, bail
        if (!token) {
          set({ isLoading: false })
          // Still check server availability in the background
          get().checkServer()
          return
        }

        // Step 3: Configure MusicKit with the token
        try {
          const instance = await configureMusicKit(token)
          const isAuthorized = instance.isAuthorized

          set({
            developerToken: token,
            isAuthorized,
            musicUserToken: isAuthorized ? instance.musicUserToken : null,
            isLoading: false,
          })
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to initialize MusicKit',
          })
        }
      },

      authorize: async () => {
        try {
          set({ isLoading: true, error: null })
          const instance = getMusicKitInstance()
          if (!instance) throw new Error('MusicKit not initialized')

          const token = await instance.authorize()
          set({
            isAuthorized: true,
            musicUserToken: token,
            isLoading: false,
          })
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'Authorization failed',
          })
        }
      },

      signOut: async () => {
        try {
          const instance = getMusicKitInstance()
          if (instance) {
            await instance.unauthorize()
          }
          set({
            isAuthorized: false,
            musicUserToken: null,
          })
        } catch (error) {
          console.error('Sign out error:', error)
        }
      },
    }),
    {
      name: 'musictron-auth',
      partialize: (state) => ({
        developerToken:
          // Don't persist server-fetched tokens — they'll be re-fetched
          state.tokenSource === 'manual' ? state.developerToken : '',
        serverUrl: state.serverUrl,
        tokenSource: state.tokenSource,
      }),
    },
  ),
)
