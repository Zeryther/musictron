// MusicKit JS loader and helper utilities

const MUSICKIT_JS_URL = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
const PROTECTED_AUDIO_CONFIG: MediaKeySystemConfiguration[] = [
  {
    initDataTypes: ['cenc', 'sinf'],
    audioCapabilities: [
      { contentType: 'audio/mp4; codecs="mp4a.40.2"' },
      { contentType: 'audio/mp4; codecs="mp4a.40.5"' },
    ],
  },
]
const DRM_KEY_SYSTEMS = [
  'com.widevine.alpha',
  'com.apple.fps.1_0',
  'com.microsoft.playready',
]

let musicKitLoadPromise: Promise<void> | null = null
let debugInstalled = false

export function loadMusicKit(): Promise<void> {
  if (musicKitLoadPromise) return musicKitLoadPromise

  musicKitLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.MusicKit) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = MUSICKIT_JS_URL
    script.async = true
    script.onload = () => {
      // MusicKit dispatches a 'musickitloaded' event
      if (window.MusicKit) {
        resolve()
      } else {
        document.addEventListener('musickitloaded', () => resolve(), {
          once: true,
        })
      }
    }
    script.onerror = () => reject(new Error('Failed to load MusicKit JS'))
    document.head.appendChild(script)
  })

  return musicKitLoadPromise
}

export async function configureMusicKit(
  developerToken: string,
): Promise<MusicKit.MusicKitInstance> {
  await loadMusicKit()

  const instance = await window.MusicKit.configure({
    developerToken,
    app: {
      name: 'Musictron',
      build: '1.0.0',
    },
  })

  installMusictronDebug()
  logMusicKitDebug('configured')

  return instance
}

export function getMusicKitInstance(): MusicKit.MusicKitInstance | null {
  try {
    return window.MusicKit?.getInstance() ?? null
  } catch {
    return null
  }
}

export interface BrowserPlaybackSupport {
  isSecureContext: boolean
  hasMediaKeySystemAccess: boolean
  supportedKeySystems: string[]
}

export async function getBrowserPlaybackSupport(): Promise<BrowserPlaybackSupport> {
  if (typeof window === 'undefined') {
    return {
      isSecureContext: false,
      hasMediaKeySystemAccess: false,
      supportedKeySystems: [],
    }
  }

  if (typeof navigator.requestMediaKeySystemAccess !== 'function') {
    return {
      isSecureContext: window.isSecureContext,
      hasMediaKeySystemAccess: false,
      supportedKeySystems: [],
    }
  }

  const supportedKeySystems: string[] = []

  for (const keySystem of DRM_KEY_SYSTEMS) {
    try {
      await navigator.requestMediaKeySystemAccess(
        keySystem,
        PROTECTED_AUDIO_CONFIG,
      )
      supportedKeySystems.push(keySystem)
    } catch {
      // Unsupported key systems are expected on many browser/platform pairs.
    }
  }

  return {
    isSecureContext: window.isSecureContext,
    hasMediaKeySystemAccess: true,
    supportedKeySystems,
  }
}

export function installMusictronDebug() {
  if (typeof window === 'undefined' || debugInstalled) return
  debugInstalled = true
  window.__musictronDebug = () => getMusicKitDebugSnapshot('manual')
  window.__musictronAuthProbe = async () => {
    const instance = getMusicKitInstance()
    if (!instance) return { error: 'No MusicKit instance' }

    const probe = {
      snapshot: getMusicKitDebugSnapshot('auth-probe'),
      meStorefront: null as unknown,
      meLibrarySongs: null as unknown,
    }

    try {
      const response = await instance.api.music('/v1/me/storefront')
      probe.meStorefront = {
        ok: true,
        data: response.data,
      }
    } catch (error) {
      probe.meStorefront = {
        ok: false,
        error: serializeMusicKitError(error),
      }
    }

    try {
      const response = await instance.api.music('/v1/me/library/songs', {
        limit: 1,
      })
      probe.meLibrarySongs = {
        ok: true,
        data: response.data,
      }
    } catch (error) {
      probe.meLibrarySongs = {
        ok: false,
        error: serializeMusicKitError(error),
      }
    }

    return probe
  }
  window.__musictronQueueProbe = async (songId: string, url?: string) => {
    const instance = getMusicKitInstance()
    if (!instance) return { error: 'No MusicKit instance' }

    const variants: Array<{
      name: string
      options: MusicKit.SetQueueOptions
    }> = [
      {
        name: 'song',
        options: { song: songId, startPlaying: true },
      },
      {
        name: 'songs',
        options: { songs: [songId], startWith: 0, startPlaying: true },
      },
    ]

    if (url) {
      variants.push({
        name: 'url',
        options: { url, startPlaying: true },
      })
    }

    const results: Record<string, unknown> = {}

    for (const variant of variants) {
      try {
        instance.stop()
        await instance.setQueue(variant.options)
        await new Promise((resolve) => setTimeout(resolve, 750))
        results[variant.name] = getMusicKitDebugSnapshot(
          `queue-probe.${variant.name}`,
        )
      } catch (error) {
        results[variant.name] = {
          ok: false,
          error: serializeMusicKitError(error),
        }
      }
    }

    return results
  }
  window.__musictronDrmProbe = async () => {
    if (typeof navigator.requestMediaKeySystemAccess !== 'function') {
      return { supported: false, error: 'requestMediaKeySystemAccess missing' }
    }

    const results: Record<string, unknown> = {}

    for (const keySystem of DRM_KEY_SYSTEMS) {
      try {
        const access = await navigator.requestMediaKeySystemAccess(
          keySystem,
          PROTECTED_AUDIO_CONFIG,
        )
        results[keySystem] = {
          ok: true,
          keySystem: access.keySystem,
          configuration: access.getConfiguration(),
        }
      } catch (error) {
        results[keySystem] = {
          ok: false,
          error: serializeMusicKitError(error),
        }
      }
    }

    return {
      browser: getBrowserPlaybackDebug(),
      results,
    }
  }
}

export function logMusicKitDebug(
  label: string,
  extra?: Record<string, unknown>,
) {
  if (!isMusictronDebugEnabled()) return
  // eslint-disable-next-line no-console -- Local/opt-in MusicKit diagnostics.
  console.info('[musictron:musickit]', getMusicKitDebugSnapshot(label), extra)
}

export function getMusicKitDebugSnapshot(label: string) {
  const instance = getMusicKitInstance()
  const developerToken = instance?.developerToken
  const tokenPayload = decodeJwtPayload(developerToken)
  const nowPlaying = instance?.nowPlayingItem

  return {
    label,
    href: typeof window !== 'undefined' ? window.location.href : null,
    hasMusicKit: typeof window !== 'undefined' ? !!window.MusicKit : false,
    browser: getBrowserPlaybackDebug(),
    instanceProperties: getInstancePropertyDebug(instance),
    hasInstance: !!instance,
    isAuthorized: instance?.isAuthorized ?? null,
    hasMusicUserToken: !!instance?.musicUserToken,
    musicUserTokenLength: instance?.musicUserToken?.length ?? 0,
    developerToken: tokenPayload
      ? {
          ttlSeconds: tokenPayload.exp - tokenPayload.iat,
          expiresInSeconds: tokenPayload.exp - Math.floor(Date.now() / 1000),
          hasOriginClaim: 'origin' in tokenPayload,
        }
      : null,
    storefrontId: instance?.storefrontId ?? null,
    storefrontCountryCode: instance?.storefrontCountryCode ?? null,
    playbackState: instance?.playbackState ?? null,
    currentPlaybackTime: instance?.currentPlaybackTime ?? null,
    currentPlaybackDuration: instance?.currentPlaybackDuration ?? null,
    nowPlayingItem: nowPlaying
      ? {
          id: nowPlaying.id,
          type: nowPlaying.type,
          durationInMillis: nowPlaying.attributes.durationInMillis,
          playParams: nowPlaying.attributes.playParams,
          url: nowPlaying.attributes.url,
        }
      : null,
    queue: instance?.queue
      ? {
          length: instance.queue.length,
          position: instance.queue.position,
          firstItems: (instance.queue.items ?? []).slice(0, 3).map((item) => ({
            id: item.id,
            type: item.type,
            durationInMillis: item.attributes.durationInMillis,
            playParams: item.attributes.playParams,
          })),
        }
      : null,
    persistedAuth: getPersistedAuthDebug(),
  }
}

function getInstancePropertyDebug(instance: MusicKit.MusicKitInstance | null) {
  if (!instance) return null
  const record = instance as unknown as Record<string, unknown>

  return {
    keys: Object.keys(record).sort(),
    selected: {
      authorizationStatus: record.authorizationStatus ?? null,
      capabilities: record.capabilities ?? null,
      subscription: record.subscription ?? null,
      userCapabilities: record.userCapabilities ?? null,
      playbackCapabilities: record.playbackCapabilities ?? null,
      canPlayCatalogContent: record.canPlayCatalogContent ?? null,
      canPlayFullCatalogPlayback: record.canPlayFullCatalogPlayback ?? null,
    },
  }
}

function getBrowserPlaybackDebug() {
  if (typeof window === 'undefined') return null

  return {
    isSecureContext: window.isSecureContext,
    hasRequestMediaKeySystemAccess:
      typeof navigator.requestMediaKeySystemAccess === 'function',
    protocol: window.location.protocol,
    host: window.location.host,
  }
}

function isMusictronDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (window.localStorage.getItem('musictron-debug') === '0') return false
  if (window.localStorage.getItem('musictron-debug') === '1') return true

  const host = window.location.hostname
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'devbox' ||
    host.endsWith('.local')
  )
}

function decodeJwtPayload(token: string | undefined) {
  if (!token) return null

  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      iat: number
      exp: number
      origin?: string[]
    }
  } catch {
    return null
  }
}

function getPersistedAuthDebug() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem('musictron-auth')
    if (!raw) return null
    const state = JSON.parse(raw).state
    return {
      serverUrl: state?.serverUrl ?? null,
      tokenSource: state?.tokenSource ?? null,
      hasPersistedDeveloperToken: !!state?.developerToken,
    }
  } catch {
    return null
  }
}

function serializeMusicKitError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  try {
    return JSON.parse(JSON.stringify(error))
  } catch {
    return String(error)
  }
}

/**
 * Extract the first chart group's data from a results entry.
 * Chart endpoints return arrays like `results.songs = [{ data: [...] }]`.
 */
export function getChartData(
  entry: MusicKit.ChartGroup[] | MusicKit.SearchResultList | undefined,
): MusicKit.Resource[] {
  if (!entry) return []
  if (Array.isArray(entry)) return entry[0]?.data ?? []
  return entry.data ?? []
}

// Apple Music API helper
export async function musicAPI(
  path: string,
  params?: Record<string, string | number | boolean>,
): Promise<MusicKit.APIResponseData> {
  const instance = getMusicKitInstance()
  if (!instance) throw new Error('MusicKit not configured')

  // Replace storefront placeholder with actual storefront
  const storefront =
    instance.storefrontCountryCode || instance.storefrontId || 'us'
  const resolvedPath = path.replace('{{storefrontId}}', storefront)

  const response = await instance.api.music(resolvedPath, params)
  return response.data
}
