import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getAppConfig } from '@/lib/platform'

interface LastfmState {
  /** Whether the user has an active Last.fm session */
  isConnected: boolean
  /** Last.fm username */
  username: string | null
  /** Last.fm session key (infinite lifetime, revocable by user) */
  sessionKey: string | null
  /** Whether Last.fm is configured on the server */
  serverConfigured: boolean | null
  /** Whether scrobbling is enabled (user toggle) */
  scrobblingEnabled: boolean
  /** Whether "Now Playing" updates are enabled (user toggle) */
  nowPlayingEnabled: boolean

  // Actions
  checkServer: () => Promise<boolean>
  startAuth: () => Promise<{ url: string; token: string } | null>
  pollForSession: (token: string) => Promise<boolean>
  disconnect: () => void
  setScrobblingEnabled: (enabled: boolean) => void
  setNowPlayingEnabled: (enabled: boolean) => void
}

/** Interval between polling attempts when waiting for user to approve (ms) */
const POLL_INTERVAL = 3000
/** Max time to wait for the user to approve (ms) */
const POLL_TIMEOUT = 5 * 60 * 1000

export const useLastfmStore = create<LastfmState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      username: null,
      sessionKey: null,
      serverConfigured: null,
      scrobblingEnabled: true,
      nowPlayingEnabled: true,

      checkServer: async () => {
        const { serverUrl } = getAppConfig()
        try {
          const res = await fetch(`${serverUrl}/api/lastfm/status`, {
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

      /**
       * Start the Last.fm auth flow (desktop-style).
       *
       * Returns `{ url, token }` — the caller should open `url` in a browser
       * and then call `pollForSession(token)` to wait for the user to approve.
       */
      startAuth: async () => {
        const { serverUrl } = getAppConfig()
        try {
          const res = await fetch(`${serverUrl}/api/lastfm/auth/start`, {
            signal: AbortSignal.timeout(10000),
          })
          if (!res.ok) return null
          const data = await res.json()
          return { url: data.url as string, token: data.token as string }
        } catch {
          return null
        }
      },

      /**
       * Poll the server to exchange the token for a session key.
       *
       * The user must approve the app on Last.fm before this succeeds.
       * Polls every few seconds until success or timeout.
       */
      pollForSession: async (token: string) => {
        const { serverUrl } = getAppConfig()
        const deadline = Date.now() + POLL_TIMEOUT

        while (Date.now() < deadline) {
          // If the user disconnected or navigated away, stop polling
          if (get().isConnected) return true

          try {
            const res = await fetch(`${serverUrl}/api/lastfm/auth/session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
              signal: AbortSignal.timeout(10000),
            })

            if (res.ok) {
              const data = await res.json()
              if (data.sessionKey && data.username) {
                set({
                  isConnected: true,
                  sessionKey: data.sessionKey,
                  username: data.username,
                })
                return true
              }
            }
          } catch {
            // Token not yet authorized or network error — keep polling
          }

          // Wait before next attempt
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
        }

        return false
      },

      disconnect: () => {
        set({
          isConnected: false,
          sessionKey: null,
          username: null,
        })
      },

      setScrobblingEnabled: (enabled: boolean) => {
        set({ scrobblingEnabled: enabled })
      },

      setNowPlayingEnabled: (enabled: boolean) => {
        set({ nowPlayingEnabled: enabled })
      },
    }),
    {
      name: 'musictron-lastfm',
      partialize: (state) => ({
        isConnected: state.isConnected,
        sessionKey: state.sessionKey,
        username: state.username,
        scrobblingEnabled: state.scrobblingEnabled,
        nowPlayingEnabled: state.nowPlayingEnabled,
      }),
    },
  ),
)
