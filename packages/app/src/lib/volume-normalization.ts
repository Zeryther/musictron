// Volume normalization: measure how loud each track is so the player can turn
// loud masters down to a common target (like Apple's Sound Check).
//
// Full-length Apple Music streams are DRM-protected and can't be analysed, but
// every catalog song has an unencrypted, CORS-enabled 30-second preview cut
// from the same master. Its integrated loudness is a good per-track estimate.

import { measureIntegratedLoudness } from '@/lib/loudness'
import { logMusicKitDebug, musicAPI } from '@/lib/musickit'
import { useVolumeNormalizationStore } from '@/stores/volume-normalization-store'

const DECODE_SAMPLE_RATE = 44100

/** Upcoming queue items measured ahead of time so they start at the right level. */
const PREFETCH_COUNT = 2

/** How long to wait before retrying a measurement that failed transiently. */
const RETRY_AFTER_MS = 60_000

const inFlight = new Map<string, Promise<number | null>>()
/** Songs that failed to measure, and when they may be tried again. */
const unavailableUntil = new Map<string, number>()
/** Prefetches run one at a time so they don't compete with playback. */
let prefetchChain: Promise<unknown> = Promise.resolve()
/** Songs the latest prefetch request still wants; stale jobs are skipped. */
let wantedPrefetches = new Set<string>()

/** A measurement that will fail the same way if retried. */
class UnmeasurableError extends Error {}

/**
 * Catalog id used as the loudness cache key, or null for items that can't be
 * measured: uploaded tracks, music videos and stations.
 */
export function getCatalogSongId(item: MusicKit.MediaItem): string | null {
  const kind = item.attributes?.playParams?.kind
  if (kind ? kind !== 'song' : /video|station/.test(item.type)) return null

  const catalogId = item.attributes?.playParams?.catalogId
  if (catalogId) return catalogId
  return /^\d+$/.test(item.id) ? item.id : null
}

async function resolvePreviewUrl(
  item: MusicKit.MediaItem,
  catalogId: string,
): Promise<string | null> {
  const direct = item.attributes?.previews?.[0]?.url
  if (direct) return direct

  // Library items don't carry previews; look them up on the catalog song.
  const data = await musicAPI(
    `/v1/catalog/{{storefrontId}}/songs/${catalogId}`,
    {
      'fields[songs]': 'previews',
    },
  )
  const previews = data.data?.[0]?.attributes?.previews as
    | Array<{ url?: string }>
    | undefined
  return previews?.[0]?.url ?? null
}

/** Download and decode a preview clip, returning its loudness in LUFS. */
export async function measurePreviewLoudness(url: string): Promise<number> {
  const response = await fetch(url)
  if (!response.ok) {
    const message = `Preview request failed (${response.status})`
    throw response.status === 404 || response.status === 410
      ? new UnmeasurableError(message)
      : new Error(message)
  }
  const encoded = await response.arrayBuffer()
  const context = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE)
  const audio = await context.decodeAudioData(encoded).catch((error) => {
    // Unsupported codec or corrupt file: retrying won't help.
    throw new UnmeasurableError(
      error instanceof Error ? error.message : String(error),
    )
  })
  const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
    audio.getChannelData(i),
  )
  return measureIntegratedLoudness(channels, audio.sampleRate)
}

/**
 * Loudness of a track in LUFS — from the cache, or by measuring its preview.
 * Resolves to null when the track can't be measured.
 */
export function getTrackLoudness(
  item: MusicKit.MediaItem,
): Promise<number | null> {
  const songId = getCatalogSongId(item)
  if (!songId || (unavailableUntil.get(songId) ?? 0) > Date.now()) {
    return Promise.resolve(null)
  }

  const cached = useVolumeNormalizationStore.getState().loudnessCache[songId]
  if (cached) return Promise.resolve(cached.lufs)

  const pending = inFlight.get(songId)
  if (pending) return pending

  const promise = (async () => {
    try {
      const url = await resolvePreviewUrl(item, songId)
      if (!url) throw new UnmeasurableError('No preview available')
      const lufs = await measurePreviewLoudness(url)
      if (!Number.isFinite(lufs))
        throw new UnmeasurableError('Preview is silent')
      unavailableUntil.delete(songId)
      useVolumeNormalizationStore.getState().rememberLoudness(songId, lufs)
      return lufs
    } catch (error) {
      // Network blips and API errors are retried; definitive failures aren't.
      unavailableUntil.set(
        songId,
        error instanceof UnmeasurableError
          ? Infinity
          : Date.now() + RETRY_AFTER_MS,
      )
      logMusicKitDebug('volume-normalization.measure-failed', {
        songId,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    } finally {
      inFlight.delete(songId)
    }
  })()

  inFlight.set(songId, promise)
  return promise
}

/**
 * Point normalization at the now-playing track, measuring it if needed, and
 * measure the next few `upcoming` queue items in the background (when given).
 * Idempotent per track.
 */
export function normalizeNowPlaying(
  item: MusicKit.MediaItem | null,
  upcoming?: MusicKit.MediaItem[],
) {
  const store = useVolumeNormalizationStore.getState()
  if (!store.enabled) return

  if (!item) {
    if (store.track) store.setTrack(null)
    return
  }

  if (upcoming) prefetchUpcoming(upcoming)

  const songId = getCatalogSongId(item) ?? item.id
  if (store.track?.songId === songId) return

  const cached = store.loudnessCache[songId]
  if (cached) {
    store.setTrack({ songId, status: 'ready', loudness: cached.lufs })
  } else {
    store.setTrack({ songId, status: 'pending', loudness: null })
    void getTrackLoudness(item).then((lufs) => {
      const current = useVolumeNormalizationStore.getState()
      // The track changed while measuring; its own call takes over.
      if (current.track?.songId !== songId) return
      current.setTrack(
        lufs === null
          ? { songId, status: 'unavailable', loudness: null }
          : { songId, status: 'ready', loudness: lufs },
      )
    })
  }
}

/** Measure the next few queue items in the background, one at a time. */
function prefetchUpcoming(upcoming: MusicKit.MediaItem[]) {
  const prefetches = upcoming.slice(0, PREFETCH_COUNT)
  const ids = prefetches.map((next) => getCatalogSongId(next) ?? next.id)
  // Already queued for this exact set (syncs fire repeatedly per track).
  if (
    ids.length === wantedPrefetches.size &&
    ids.every((id) => wantedPrefetches.has(id))
  ) {
    return
  }

  wantedPrefetches = new Set(ids)
  prefetches.forEach((next, index) => {
    const nextId = ids[index]
    prefetchChain = prefetchChain.then(() =>
      // Skipped past, or normalization turned off, while queued.
      nextId &&
      wantedPrefetches.has(nextId) &&
      useVolumeNormalizationStore.getState().enabled
        ? getTrackLoudness(next)
        : null,
    )
  })
}
