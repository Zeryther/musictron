/**
 * Last.fm Scrobbler Service
 *
 * Subscribes to the player store and automatically sends "Now Playing"
 * updates and scrobbles to Last.fm via the Musictron API server.
 *
 * Scrobble rules (per Last.fm spec):
 *   - Track must be > 30 seconds
 *   - Track has played for >= 50% of its duration, or >= 4 minutes
 *     (whichever comes first)
 *
 * Failed scrobbles are cached in localStorage and retried on next
 * successful scrobble or app startup.
 */

import { usePlayerStore, type NowPlayingItem } from '@/stores/player-store'
import { useLastfmStore } from '@/stores/lastfm-store'
import { getAppConfig } from '@/lib/platform'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CachedScrobble {
  artist: string
  track: string
  album?: string
  timestamp: number
  duration?: number
}

// ─── State ───────────────────────────────────────────────────────────────────

const SCROBBLE_CACHE_KEY = 'musictron-scrobble-cache'
const MIN_TRACK_DURATION = 30 // seconds
const MAX_SCROBBLE_TIME = 4 * 60 // 4 minutes in seconds

/** The track we're currently tracking for scrobbling */
let currentTrack: {
  id: string
  artist: string
  track: string
  album: string
  duration: number
  startTimestamp: number
  /** Accumulated playback time in seconds (updated from player's currentTime) */
  lastKnownPlaybackTime: number
  scrobbled: boolean
  nowPlayingSent: boolean
} | null = null

let unsubscribePlayer: (() => void) | null = null

// ─── Cache Management ────────────────────────────────────────────────────────

function getCachedScrobbles(): CachedScrobble[] {
  try {
    const raw = localStorage.getItem(SCROBBLE_CACHE_KEY)
    return raw ? (JSON.parse(raw) as CachedScrobble[]) : []
  } catch {
    return []
  }
}

function saveCachedScrobbles(scrobbles: CachedScrobble[]): void {
  try {
    localStorage.setItem(SCROBBLE_CACHE_KEY, JSON.stringify(scrobbles))
  } catch {
    // localStorage full or unavailable — drop oldest entries
    console.warn('[lastfm] Failed to save scrobble cache')
  }
}

function addToCachedScrobbles(scrobble: CachedScrobble): void {
  const cached = getCachedScrobbles()
  cached.push(scrobble)
  // Keep at most 500 cached scrobbles to avoid unbounded growth
  if (cached.length > 500) {
    cached.splice(0, cached.length - 500)
  }
  saveCachedScrobbles(cached)
}

// ─── API Calls ───────────────────────────────────────────────────────────────

async function sendNowPlaying(
  artist: string,
  track: string,
  album: string | undefined,
  duration: number | undefined,
  sk: string,
): Promise<void> {
  const { serverUrl } = getAppConfig()

  try {
    const res = await fetch(`${serverUrl}/api/lastfm/now-playing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist, track, album, duration, sk }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.warn('[lastfm] Now Playing failed:', res.status)
    }
  } catch (err) {
    // Now Playing failures should not be retried per the spec
    console.warn('[lastfm] Now Playing error:', err)
  }
}

async function sendScrobble(
  scrobbles: CachedScrobble[],
  sk: string,
): Promise<boolean> {
  const { serverUrl } = getAppConfig()

  try {
    const res = await fetch(`${serverUrl}/api/lastfm/scrobble`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scrobbles, sk }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      // Check if the error is retryable
      if (data.retryable) {
        return false // Caller should cache for retry
      }
      console.warn('[lastfm] Scrobble rejected:', data.error)
      return true // Non-retryable error — don't cache
    }

    return true
  } catch {
    return false // Network error — cache for retry
  }
}

async function retryCachedScrobbles(): Promise<void> {
  const lastfm = useLastfmStore.getState()
  if (!lastfm.isConnected || !lastfm.sessionKey || !lastfm.scrobblingEnabled) {
    return
  }

  const cached = getCachedScrobbles()
  if (cached.length === 0) return

  // Send in batches of 50 (Last.fm limit)
  const batch = cached.splice(0, 50)
  const success = await sendScrobble(batch, lastfm.sessionKey)

  if (success) {
    // Remove the successfully sent batch
    saveCachedScrobbles(cached)

    // If there are more cached scrobbles, retry after a short delay
    if (cached.length > 0) {
      setTimeout(retryCachedScrobbles, 2000)
    }
  } else {
    // Put the batch back at the front
    saveCachedScrobbles([...batch, ...cached])
  }
}

// ─── Scrobble Logic ──────────────────────────────────────────────────────────

function onNowPlayingChanged(nowPlaying: NowPlayingItem | null): void {
  const lastfm = useLastfmStore.getState()

  if (!nowPlaying || !lastfm.isConnected || !lastfm.sessionKey) {
    currentTrack = null
    return
  }

  // Check if this is actually a new track
  if (currentTrack?.id === nowPlaying.id) return

  // Scrobble the previous track if it qualified but wasn't scrobbled yet
  scrobblePreviousTrackIfNeeded()

  // Start tracking the new track
  currentTrack = {
    id: nowPlaying.id,
    artist: nowPlaying.artistName,
    track: nowPlaying.name,
    album: nowPlaying.albumName,
    duration: nowPlaying.duration,
    startTimestamp: Math.floor(Date.now() / 1000),
    lastKnownPlaybackTime: 0,
    scrobbled: false,
    nowPlayingSent: false,
  }

  // Send Now Playing update
  if (lastfm.nowPlayingEnabled) {
    currentTrack.nowPlayingSent = true
    sendNowPlaying(
      nowPlaying.artistName,
      nowPlaying.name,
      nowPlaying.albumName,
      nowPlaying.duration > 0 ? Math.round(nowPlaying.duration) : undefined,
      lastfm.sessionKey,
    )
  }
}

function scrobblePreviousTrackIfNeeded(): void {
  if (!currentTrack || currentTrack.scrobbled) return

  const lastfm = useLastfmStore.getState()
  if (!lastfm.isConnected || !lastfm.sessionKey || !lastfm.scrobblingEnabled) {
    return
  }

  // Check if the track qualifies for scrobbling based on actual playback time
  // (not wall-clock time, which would be inflated if the track was paused)
  if (
    shouldScrobble(currentTrack.duration, currentTrack.lastKnownPlaybackTime)
  ) {
    doScrobble(currentTrack, lastfm.sessionKey)
  }
}

function shouldScrobble(duration: number, elapsed: number): boolean {
  // Track must be > 30 seconds
  if (duration <= MIN_TRACK_DURATION) return false

  // Must have played for >= 50% of duration or >= 4 minutes
  const threshold = Math.min(duration / 2, MAX_SCROBBLE_TIME)
  return elapsed >= threshold
}

function doScrobble(track: NonNullable<typeof currentTrack>, sk: string): void {
  if (track.scrobbled) return
  track.scrobbled = true

  const scrobble: CachedScrobble = {
    artist: track.artist,
    track: track.track,
    album: track.album || undefined,
    timestamp: track.startTimestamp,
    duration: track.duration > 0 ? Math.round(track.duration) : undefined,
  }

  sendScrobble([scrobble], sk).then((success) => {
    if (!success) {
      addToCachedScrobbles(scrobble)
    }
  })
}

function onTimeUpdate(currentTime: number): void {
  if (!currentTrack || currentTrack.scrobbled) return

  // Always update the last known playback position so that
  // scrobblePreviousTrackIfNeeded() has an accurate value
  currentTrack.lastKnownPlaybackTime = currentTime

  const lastfm = useLastfmStore.getState()
  if (!lastfm.isConnected || !lastfm.sessionKey || !lastfm.scrobblingEnabled) {
    return
  }

  // Check if we've reached the scrobble threshold
  if (shouldScrobble(currentTrack.duration, currentTime)) {
    doScrobble(currentTrack, lastfm.sessionKey)
  }
}

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize the Last.fm scrobbler.
 * Subscribes to the player store and starts tracking playback.
 * Should be called once after `initializePlayerEvents()`.
 */
export function initializeScrobbler(): void {
  // Avoid double initialization
  if (unsubscribePlayer) return

  // Track nowPlaying changes and currentTime updates
  let lastNowPlayingId: string | null = null
  let lastCheckedTime = 0

  unsubscribePlayer = usePlayerStore.subscribe((state) => {
    // Detect track changes
    const nowPlayingId = state.nowPlaying?.id ?? null
    if (nowPlayingId !== lastNowPlayingId) {
      lastNowPlayingId = nowPlayingId
      lastCheckedTime = 0
      onNowPlayingChanged(state.nowPlaying)
    }

    // Check scrobble threshold on time updates (throttle to ~once per second)
    if (state.isPlaying && state.currentTime - lastCheckedTime >= 1) {
      lastCheckedTime = state.currentTime
      onTimeUpdate(state.currentTime)
    }
  })

  // Retry any cached scrobbles from previous sessions
  retryCachedScrobbles()
}

/**
 * Tear down the scrobbler. Called when the app unmounts (if needed).
 */
export function destroyScrobbler(): void {
  // Scrobble the current track if it qualifies
  scrobblePreviousTrackIfNeeded()

  if (unsubscribePlayer) {
    unsubscribePlayer()
    unsubscribePlayer = null
  }

  currentTrack = null
}
