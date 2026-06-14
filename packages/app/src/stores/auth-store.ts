import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  configureMusicKit,
  getMusicKitInstance,
  logMusicKitDebug,
} from '@/lib/musickit'
import { getAppConfig } from '@/lib/platform'
import { initializePlayerEvents } from '@/stores/player-store'

interface AuthState {
  isAuthorized: boolean
  isLoading: boolean
  developerToken: string
  musicUserToken: string | null
  error: string | null
  serverUrl: string
  serverConfigured: boolean | null // null = unknown
  tokenSource: 'server' | 'manual' | 'none'
  /** When the current server token expires (epoch ms), or null if unknown. */
  tokenExpiresAt: number | null

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
      tokenExpiresAt: null,

      setDeveloperToken: (token: string) => {
        // Manual tokens have no known expiry and can't be re-minted from the
        // server, so they are never auto-refreshed.
        set({
          developerToken: token,
          tokenSource: 'manual',
          tokenExpiresAt: null,
        })
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
        const result = await fetchTokenResponse(serverUrl)
        if (!result) return null
        set({
          developerToken: result.token,
          tokenSource: 'server',
          tokenExpiresAt: result.expiresAt,
        })
        return result.token
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

        // Step 3: Configure MusicKit with the token.
        // configureWithToken dedupes concurrent/re-entrant calls — the App
        // effect re-runs whenever developerToken changes, so this keeps the
        // first-load fetch→configure sequence from configuring twice.
        try {
          const instance = await configureWithToken(token)
          const isAuthorized = instance.isAuthorized
          logMusicKitDebug('auth.initialize.after-configure')

          set({
            developerToken: token,
            isAuthorized,
            musicUserToken: isAuthorized ? instance.musicUserToken : null,
            isLoading: false,
          })

          // Keep the developer token fresh for long-running sessions.
          attachRefreshTriggers()
          scheduleTokenRefresh()
        } catch (error) {
          set({
            isLoading: false,
            error: getMusicKitAuthErrorMessage(error, 'initialize'),
          })
        }
      },

      authorize: async () => {
        try {
          set({ isLoading: true, error: null })
          let instance = getMusicKitInstance()
          if (!instance) {
            await get().initialize()
            instance = getMusicKitInstance()
          }
          if (!instance) throw new Error('MusicKit not initialized')

          logMusicKitDebug('auth.authorize.before')
          const token = await instance.authorize()
          logMusicKitDebug('auth.authorize.after', {
            returnedMusicUserTokenLength: token.length,
          })
          set({
            isAuthorized: true,
            musicUserToken: token,
            isLoading: false,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: getMusicKitAuthErrorMessage(error, 'authorize'),
          })
        }
      },

      signOut: async () => {
        try {
          const instance = getMusicKitInstance()
          if (instance) await instance.unauthorize()
        } catch (error) {
          console.error('Sign out error:', error)
        } finally {
          set({
            isAuthorized: false,
            musicUserToken: null,
          })
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

function getMusicKitAuthErrorMessage(
  error: unknown,
  phase: 'initialize' | 'authorize',
): string {
  const message = error instanceof Error ? error.message : String(error)

  if (/failed to load musickit/i.test(message)) {
    return 'Failed to load MusicKit JS. Check your network, proxy, VPN, or content blocker access to js-cdn.music.apple.com.'
  }

  if (/musickit.*not.*initialized/i.test(message)) {
    return 'MusicKit is not initialized yet. Check that the Musictron server is running and try signing in again.'
  }

  if (/network|fetch|timeout|proxy|407/i.test(message)) {
    return 'Apple Music could not be reached. Check your network, proxy, VPN, or content blocker settings.'
  }

  if (/unauthori[sz]ed|forbidden|401|403/i.test(message)) {
    return 'Apple Music rejected this session. Sign out, sign in again, and verify your Apple Music subscription.'
  }

  if (phase === 'initialize') {
    return message || 'Failed to initialize MusicKit.'
  }

  return message || 'Authorization failed.'
}

// ──────────────────────────────────────────────────────────────────────────
// Proactive developer-token refresh
//
// The server mints long-lived (~6 month) developer tokens, so the token does
// not expire during a session and this refresh effectively never runs mid-use.
// It stays as a backstop for sessions that outlive the token: re-fetch before
// expiry and update the instance in place.
//
// IMPORTANT: the in-place update (applyToken) reaches catalog/library API calls
// but NOT MusicKit's DRM/license pipeline, which captures the developer token
// at configure() time. A true mid-session token swap would need a full
// reconfigure — which previously broke auth — so we rely on long-lived tokens
// to avoid mid-session expiry entirely rather than rotating during playback.
// ──────────────────────────────────────────────────────────────────────────

/** Refresh this far ahead of the token's expiry. */
const REFRESH_BUFFER_MS = 10 * 60 * 1000
/** setTimeout's 32-bit ceiling (~24.8 days); larger delays fire immediately. */
const MAX_TIMEOUT = 2_147_483_647
/** Retry delay after a transient refresh failure (server offline, etc.). */
const REFRESH_RETRY_MS = 60 * 1000

let refreshTimer: ReturnType<typeof setTimeout> | null = null
let refreshTriggersAttached = false

// Dedupe concurrent/re-entrant configure calls. The App effect re-runs whenever
// developerToken changes (which our own refresh does), so without this a refresh
// would retrigger a redundant reconfigure that could interrupt playback.
let lastConfiguredToken: string | null = null
let configurePromise: Promise<MusicKit.MusicKitInstance> | null = null

/**
 * Configure MusicKit with a token, deduping concurrent/re-entrant calls for the
 * same token so it is never configured twice in flight.
 */
async function configureWithToken(
  token: string,
): Promise<MusicKit.MusicKitInstance> {
  if (lastConfiguredToken === token && configurePromise) {
    return configurePromise
  }
  lastConfiguredToken = token
  const promise = configureMusicKit(token)
  configurePromise = promise
  try {
    return await promise
  } catch (err) {
    // Roll back so a later attempt can retry this token.
    if (lastConfiguredToken === token) {
      lastConfiguredToken = null
      configurePromise = null
    }
    throw err
  }
}

/** Low-level token fetch that does not touch store state. */
async function fetchTokenResponse(
  serverUrl: string,
): Promise<{ token: string; expiresAt: number | null } | null> {
  try {
    const res = await fetch(`${serverUrl}/api/token`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.token) return null
    return {
      token: data.token,
      // The server sends epoch SECONDS; the client works in milliseconds.
      expiresAt:
        typeof data.expiresAt === 'number' ? data.expiresAt * 1000 : null,
    }
  } catch {
    return null
  }
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

/** Try again after a short, fixed delay (transient failure / token not rolled). */
function scheduleRetry() {
  clearRefreshTimer()
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void refreshToken()
  }, REFRESH_RETRY_MS)
}

/** Schedule the next refresh at (expiry − buffer), clamped against overflow. */
function scheduleTokenRefresh() {
  clearRefreshTimer()
  const { tokenSource, tokenExpiresAt } = useAuthStore.getState()
  if (tokenSource !== 'server' || tokenExpiresAt == null) return

  const untilRefresh = tokenExpiresAt - Date.now() - REFRESH_BUFFER_MS
  const delay = Math.min(Math.max(untilRefresh, 0), MAX_TIMEOUT)
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    const expiresAt = useAuthStore.getState().tokenExpiresAt
    if (expiresAt == null) return
    if (expiresAt - Date.now() <= REFRESH_BUFFER_MS) {
      void refreshToken()
    } else {
      // Clamped long delay fired early — re-arm for the remainder.
      scheduleTokenRefresh()
    }
  }, delay)
}

/** Backstop for suspended timers (sleep / backgrounded tab): refresh if due. */
function maybeRefresh() {
  const { tokenSource, tokenExpiresAt } = useAuthStore.getState()
  if (tokenSource !== 'server' || tokenExpiresAt == null) return
  if (tokenExpiresAt - Date.now() <= REFRESH_BUFFER_MS) {
    void refreshToken()
  }
}

/** Re-fetch the token and apply it to MusicKit before the old token expires. */
async function refreshToken() {
  const { serverUrl, tokenExpiresAt: current } = useAuthStore.getState()
  const result = await fetchTokenResponse(serverUrl)
  if (!result) {
    // Server unreachable — keep the current (still-valid) token, retry soon.
    scheduleRetry()
    return
  }
  if (
    result.expiresAt != null &&
    current != null &&
    result.expiresAt <= current
  ) {
    scheduleRetry()
    return
  }
  void applyToken(result.token, result.expiresAt)
}

async function applyToken(token: string, expiresAt: number | null) {
  let instance = getMusicKitInstance()

  if (instance) {
    instance.developerToken = token
    lastConfiguredToken = token
    configurePromise = Promise.resolve(instance)
    logMusicKitDebug('auth.refresh.applied-in-place')
  } else {
    try {
      instance = await configureWithToken(token)
      logMusicKitDebug('auth.refresh.configured')
    } catch {
      // Reconfigure failed — keep the old token and retry shortly.
      scheduleRetry()
      return
    }
  }

  useAuthStore.setState({
    developerToken: token,
    isAuthorized: instance.isAuthorized,
    musicUserToken: instance.isAuthorized ? instance.musicUserToken : null,
    tokenSource: 'server',
    tokenExpiresAt: expiresAt,
  })
  initializePlayerEvents()
  scheduleTokenRefresh()
}

/** Attach one-time backstop listeners that re-check expiry on app activity. */
function attachRefreshTriggers() {
  if (refreshTriggersAttached || typeof window === 'undefined') return
  refreshTriggersAttached = true
  window.addEventListener('focus', maybeRefresh)
  window.addEventListener('online', maybeRefresh)
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') maybeRefresh()
}
