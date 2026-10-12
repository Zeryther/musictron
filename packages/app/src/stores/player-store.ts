import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getBrowserPlaybackSupport,
  getMusicKitInstance,
  logMusicKitDebug,
  musicAPI,
} from '@/lib/musickit'
import {
  isAudioProcessingActive,
  resumeAudioProcessing,
  setProcessingGains,
  setStableVolumeCompression,
  startAudioProcessing,
} from '@/lib/audio-processing'
import { formatArtworkUrl } from '@/lib/utils'
import { normalizeNowPlaying } from '@/lib/volume-normalization'
import {
  selectNormalizationGain,
  useVolumeNormalizationStore,
} from '@/stores/volume-normalization-store'

export interface NowPlayingItem {
  id: string
  name: string
  artistName: string
  albumName: string
  artworkUrl: string
  duration: number
  artistId?: string
  albumId?: string
  artworkColors?: {
    bg: string
    text1: string
    text2: string
  }
}

/**
 * The list a queue was started from. Lets that list's rows tell which
 * occurrence of a repeated song is playing.
 */
export interface PlayContext {
  /** Caller-chosen id of the list, e.g. `playlist:<id>`. */
  key: string
  /** Index in the list of the first song MusicKit was asked to queue. */
  offset: number
}

export interface PlaybackError {
  title: string
  message: string
}

interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  nowPlaying: NowPlayingItem | null
  queue: NowPlayingItem[]
  queuePosition: number
  playContext: PlayContext | null
  repeatMode: number // 0=none, 1=one, 2=all
  shuffleMode: number // 0=off, 1=on
  isQueueOpen: boolean
  isFullscreen: boolean
  playbackError: PlaybackError | null

  // Actions
  play: () => Promise<void>
  pause: () => void
  togglePlayPause: () => Promise<void>
  skipNext: () => Promise<void>
  skipPrevious: () => Promise<void>
  seekTo: (time: number) => Promise<void>
  setVolume: (volume: number) => void
  toggleRepeat: () => void
  toggleShuffle: () => void
  toggleQueue: () => void
  setFullscreen: (value: boolean) => void
  clearPlaybackError: () => void

  // Queue management
  playTrack: (
    trackId: string,
    options?: { startPlaying?: boolean },
  ) => Promise<void>
  playAlbum: (albumId: string, startIndex?: number) => Promise<void>
  playPlaylist: (playlistId: string, startIndex?: number) => Promise<void>
  playSongs: (
    songIds: string[],
    startIndex?: number,
    contextKey?: string,
  ) => Promise<void>
  addToQueue: (songId: string) => Promise<void>
  playNext: (songId: string) => Promise<void>

  // Internal
  _syncFromMusicKit: () => void
  _startTimeUpdater: () => void
  _stopTimeUpdater: () => void
}

let timeUpdateInterval: ReturnType<typeof setInterval> | null = null

/** Max ids MusicKit is asked to resolve per queue request. */
const QUEUE_BATCH_SIZE = 25

/** Incremented on every new queue so stale batch appends can bail out. */
let queueGeneration = 0

/**
 * Split ids into queue requests of at most `size` songs. MusicKit resolves a
 * request's ids through a map keyed by id, so a song repeated within one
 * request collapses into its last occurrence; a repeat starts a new batch.
 */
function batchQueueIds(ids: string[], size: number): string[][] {
  const batches: string[][] = []
  let batch: string[] = []
  for (const id of ids) {
    if (batch.length >= size || batch.includes(id)) {
      batches.push(batch)
      batch = []
    }
    batch.push(id)
  }
  if (batch.length > 0) batches.push(batch)
  return batches
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.5,
      nowPlaying: null,
      queue: [],
      queuePosition: 0,
      playContext: null,
      repeatMode: 0,
      shuffleMode: 0,
      isQueueOpen: false,
      isFullscreen: false,
      playbackError: null,

      play: async () => {
        resumeAudioProcessing()
        const mk = getMusicKitInstance()
        if (!mk) {
          set({
            playbackError: {
              title: 'Apple Music is not ready',
              message:
                'MusicKit has not finished loading yet. Try again in a moment.',
            },
          })
          return
        }

        try {
          await mk.play()
          set({ isPlaying: true, playbackError: null })
          get()._startTimeUpdater()
        } catch (error) {
          set({ playbackError: getPlaybackErrorMessage(error) })
        }
      },

      pause: () => {
        const mk = getMusicKitInstance()
        if (mk) {
          mk.pause()
          set({ isPlaying: false })
          get()._stopTimeUpdater()
        }
      },

      togglePlayPause: async () => {
        const { isPlaying, play, pause } = get()
        if (isPlaying) {
          pause()
        } else {
          await play()
        }
      },

      skipNext: async () => {
        const mk = getMusicKitInstance()
        if (mk) {
          await mk.skipToNextItem()
          get()._syncFromMusicKit()
        }
      },

      skipPrevious: async () => {
        const mk = getMusicKitInstance()
        if (mk) {
          if (get().currentTime > 3) {
            await mk.seekToTime(0)
          } else {
            await mk.skipToPreviousItem()
          }
          get()._syncFromMusicKit()
        }
      },

      seekTo: async (time: number) => {
        const mk = getMusicKitInstance()
        if (mk) {
          await mk.seekToTime(time)
          set({ currentTime: time })
        }
      },

      setVolume: (volume: number) => {
        const mk = getMusicKitInstance()
        if (mk) {
          set({ volume })
          applyMusicKitVolume(mk)
        }
      },

      toggleRepeat: () => {
        const mk = getMusicKitInstance()
        if (mk) {
          const nextMode = (get().repeatMode + 1) % 3
          mk.repeatMode = nextMode
          set({ repeatMode: nextMode })
        }
      },

      toggleShuffle: () => {
        const mk = getMusicKitInstance()
        if (mk) {
          const nextMode = get().shuffleMode === 0 ? 1 : 0
          mk.shuffleMode = nextMode
          set({ shuffleMode: nextMode })
        }
      },

      toggleQueue: () => {
        set((s) => ({ isQueueOpen: !s.isQueueOpen }))
      },

      setFullscreen: (value: boolean) => {
        set({ isFullscreen: value })
      },

      clearPlaybackError: () => {
        set({ playbackError: null })
      },

      playTrack: async (
        trackId: string,
        options?: { startPlaying?: boolean },
      ) => {
        resumeAudioProcessing()
        const mk = getMusicKitInstance()
        if (mk) {
          queueGeneration++
          logMusicKitDebug('player.playTrack.before-setQueue', {
            trackId,
            startPlaying: options?.startPlaying ?? true,
          })
          try {
            set({ playbackError: null })
            await mk.setQueue({
              song: trackId,
              startPlaying: options?.startPlaying ?? true,
            })
            logMusicKitDebug('player.playTrack.after-setQueue')
            set({ playContext: null })
            get()._syncFromMusicKit()
            get()._startTimeUpdater()
            schedulePreviewFallbackCheck()
          } catch (error) {
            set({ playbackError: getPlaybackErrorMessage(error) })
          }
        }
      },

      playAlbum: async (albumId: string, startIndex: number = 0) => {
        resumeAudioProcessing()
        const mk = getMusicKitInstance()
        if (mk) {
          queueGeneration++
          logMusicKitDebug('player.playAlbum.before-setQueue', {
            albumId,
            startIndex,
          })
          try {
            set({ playbackError: null })
            await mk.setQueue({
              album: albumId,
              startWith: startIndex,
              startPlaying: true,
            })
            logMusicKitDebug('player.playAlbum.after-setQueue')
            set({ playContext: { key: `album:${albumId}`, offset: 0 } })
            get()._syncFromMusicKit()
            get()._startTimeUpdater()
            schedulePreviewFallbackCheck()
          } catch (error) {
            set({ playbackError: getPlaybackErrorMessage(error) })
          }
        }
      },

      playPlaylist: async (playlistId: string, startIndex: number = 0) => {
        resumeAudioProcessing()
        const mk = getMusicKitInstance()
        if (mk) {
          queueGeneration++
          logMusicKitDebug('player.playPlaylist.before-setQueue', {
            playlistId,
            startIndex,
          })
          try {
            set({ playbackError: null })
            await mk.setQueue({
              playlist: playlistId,
              startWith: startIndex,
              startPlaying: true,
            })
            logMusicKitDebug('player.playPlaylist.after-setQueue')
            set({ playContext: { key: `playlist:${playlistId}`, offset: 0 } })
            get()._syncFromMusicKit()
            get()._startTimeUpdater()
            schedulePreviewFallbackCheck()
          } catch (error) {
            set({ playbackError: getPlaybackErrorMessage(error) })
          }
        }
      },

      playSongs: async (
        songIds: string[],
        startIndex: number = 0,
        contextKey?: string,
      ) => {
        resumeAudioProcessing()
        const mk = getMusicKitInstance()
        if (mk) {
          const generation = ++queueGeneration
          // MusicKit resolves every queued id in a single
          // `/v1/me/library/songs?ids=…` (or catalog) request, which Apple
          // rejects with a non-JSON body once the list gets long. Long lists
          // are therefore queued from the selected song onward: the first
          // batch via setQueue, the rest appended in batches via playLater.
          const isLongList = songIds.length > QUEUE_BATCH_SIZE
          const queueStart = isLongList ? startIndex : 0
          const batches = batchQueueIds(
            songIds.slice(queueStart),
            QUEUE_BATCH_SIZE,
          )
          const [firstBatch] = batches
          if (!firstBatch) return

          // A repeated song can split a short list, putting the selected song
          // in a later batch. Batches up to and including that one are queued
          // before playback starts; the rest are appended afterwards.
          const selectedOffset = startIndex - queueStart
          let selectedBatch = 0
          let batchEnd = firstBatch.length
          while (
            batchEnd <= selectedOffset &&
            selectedBatch < batches.length - 1
          ) {
            selectedBatch++
            batchEnd += batches[selectedBatch].length
          }

          logMusicKitDebug('player.playSongs.before-setQueue', {
            songCount: songIds.length,
            firstSongId: songIds[0],
            startIndex,
            batchCount: batches.length,
          })
          try {
            set({ playbackError: null })
            // Don't let MusicKit start playback by position: it silently drops
            // songs it can't play (e.g. unavailable in the storefront), which
            // shifts every later index so `startWith` lands on the wrong song.
            const queue = await mk.setQueue({
              songs: firstBatch,
              startWith: selectedBatch === 0 ? selectedOffset : 0,
              startPlaying: false,
            })
            logMusicKitDebug('player.playSongs.after-setQueue')
            set({
              playContext: contextKey
                ? { key: contextKey, offset: queueStart }
                : null,
            })

            for (const batch of batches.slice(1, selectedBatch + 1)) {
              // A newer queue request replaced this one; leave it alone.
              if (generation !== queueGeneration) return
              await mk.playLater({ songs: batch })
            }
            if (generation !== queueGeneration) return

            const targetIndex = findQueueIndex(
              (mk.queue ?? queue)?.items ?? [],
              songIds[startIndex],
              selectedOffset,
            )
            if (targetIndex === -1) {
              set({
                playbackError: {
                  title: 'Song unavailable',
                  message:
                    'This song is not available to play in your Apple Music region.',
                },
              })
              get()._syncFromMusicKit()
              return
            }

            if (mk.queue?.position === targetIndex) {
              await mk.play()
            } else {
              await mk.changeToMediaAtIndex(targetIndex)
            }
            get()._syncFromMusicKit()
            get()._startTimeUpdater()
            schedulePreviewFallbackCheck()
          } catch (error) {
            set({ playbackError: getPlaybackErrorMessage(error) })
            return
          }

          for (const batch of batches.slice(selectedBatch + 1)) {
            // A newer queue request replaced this one; stop appending.
            if (generation !== queueGeneration) return
            try {
              await mk.playLater({ songs: batch })
            } catch (error) {
              // Playback has already started; keep what is queued.
              logMusicKitDebug('player.playSongs.append-failed', {
                error: error instanceof Error ? error.message : String(error),
              })
              return
            }
          }
          get()._syncFromMusicKit()
        }
      },

      addToQueue: async (songId: string) => {
        const mk = getMusicKitInstance()
        if (mk) {
          // MusicKit v3 queue management
          await mk.setQueue({ song: songId })
          set({ playContext: null })
          get()._syncFromMusicKit()
        }
      },

      playNext: async (songId: string) => {
        const mk = getMusicKitInstance()
        if (mk) {
          await mk.setQueue({ song: songId })
          set({ playContext: null })
          get()._syncFromMusicKit()
        }
      },

      _syncFromMusicKit: () => {
        const mk = getMusicKitInstance()
        if (!mk) return

        const item = mk.nowPlayingItem
        let nowPlaying = get().nowPlaying
        if (item) {
          // Parse album ID from the Apple Music URL if available.
          // URLs look like: https://music.apple.com/us/album/{slug}/{albumId}?i={songId}
          let albumId: string | undefined
          if (item.attributes.url) {
            const match = item.attributes.url.match(/\/album\/[^/]+\/(\d+)/)
            if (match) albumId = match[1]
          }

          nowPlaying = {
            id: item.id,
            name: item.attributes.name,
            artistName: item.attributes.artistName,
            albumName: item.attributes.albumName,
            artworkUrl: formatArtworkUrl(item.attributes.artwork?.url, 600),
            duration: (item.attributes.durationInMillis || 0) / 1000,
            albumId,
            artworkColors: item.attributes.artwork
              ? {
                  bg: `#${item.attributes.artwork.bgColor || '1a1a1a'}`,
                  text1: `#${item.attributes.artwork.textColor1 || 'ffffff'}`,
                  text2: `#${item.attributes.artwork.textColor2 || 'cccccc'}`,
                }
              : undefined,
          }

          // Resolve artist ID asynchronously via the catalog API.
          // This is a lightweight call that runs in the background.
          const songCatalogId = item.attributes.playParams?.catalogId || item.id
          musicAPI(`/v1/catalog/{{storefrontId}}/songs/${songCatalogId}`, {
            'fields[songs]': 'artistUrl',
            relate: 'artists',
            'fields[artists]': 'name',
          })
            .then((data) => {
              const artistEntry =
                data.data?.[0]?.relationships?.artists?.data?.[0]
              if (artistEntry?.id) {
                const current = get().nowPlaying
                // Only update if we're still on the same track
                if (current?.id === item.id) {
                  set({ nowPlaying: { ...current, artistId: artistEntry.id } })
                }
              }
            })
            .catch(() => {
              // Non-critical — artist link just won't be available
            })
        }
        syncVolumeNormalization(mk)

        // Sync queue
        const queueItems: NowPlayingItem[] = (mk.queue?.items || []).map(
          (qItem: MusicKit.MediaItem) => ({
            id: qItem.id,
            name: qItem.attributes.name,
            artistName: qItem.attributes.artistName,
            albumName: qItem.attributes.albumName,
            artworkUrl: formatArtworkUrl(qItem.attributes.artwork?.url, 100),
            duration: (qItem.attributes.durationInMillis || 0) / 1000,
          }),
        )

        // One update, so rows never see the new track with the old position.
        set({
          nowPlaying,
          queue: queueItems,
          queuePosition: mk.queue?.position || 0,
          isPlaying: mk.playbackState === 2, // playing
          duration: mk.currentPlaybackDuration || 0,
        })
      },

      _startTimeUpdater: () => {
        get()._stopTimeUpdater()
        timeUpdateInterval = setInterval(() => {
          const mk = getMusicKitInstance()
          if (mk) {
            // Detect track changes that event listeners may have missed.
            // Compare positions too: a repeated song keeps the same id.
            const mkItemId = mk.nowPlayingItem?.id
            if (
              mkItemId &&
              (mkItemId !== get().nowPlaying?.id ||
                (mk.queue?.position || 0) !== get().queuePosition)
            ) {
              get()._syncFromMusicKit()
            }

            set({
              currentTime: mk.currentPlaybackTime || 0,
              duration: mk.currentPlaybackDuration || 0,
              isPlaying: mk.playbackState === 2,
            })
          }
        }, 250)
      },

      _stopTimeUpdater: () => {
        if (timeUpdateInterval) {
          clearInterval(timeUpdateInterval)
          timeUpdateInterval = null
        }
      },
    }),
    {
      name: 'musictron-player',
      partialize: (state) => ({
        volume: state.volume,
      }),
    },
  ),
)

const VOLUME_RAMP_MS = 400
const VOLUME_RAMP_STEPS = 10
let volumeRampTimer: ReturnType<typeof setInterval> | null = null

/**
 * Write the user's volume, scaled by the current track's normalization gain,
 * to MusicKit. With `ramp`, fade to it so a gain change isn't an audible jump.
 */
function applyMusicKitVolume(
  mk: MusicKit.MusicKitInstance,
  { ramp = false }: { ramp?: boolean } = {},
) {
  if (volumeRampTimer) {
    clearInterval(volumeRampTimer)
    volumeRampTimer = null
  }

  const { volume } = usePlayerStore.getState()
  const gain = selectNormalizationGain(useVolumeNormalizationStore.getState())

  // Stable volume, once verified working: MusicKit stays at full volume and
  // the graph applies both gains around the compressor so it sees a steady
  // level. Always write mk.volume, since MusicKit re-applies its remembered
  // volume to the element on every new item.
  if (isAudioProcessingActive()) {
    setProcessingGains(gain, volume, { fade: ramp })
    mk.volume = 1
    return
  }
  // Otherwise the element's volume is in charge; the graph (if any element
  // is routed through it) passes that through unchanged.
  setProcessingGains(1, 1)

  const target = volume * gain
  const start = mk.volume
  if (!ramp || Math.abs(target - start) < 0.001) {
    mk.volume = target
    return
  }

  let step = 0
  const timer = setInterval(() => {
    step++
    if (step >= VOLUME_RAMP_STEPS) {
      mk.volume = target
      clearInterval(timer)
      if (volumeRampTimer === timer) volumeRampTimer = null
    } else {
      mk.volume = start + ((target - start) * step) / VOLUME_RAMP_STEPS
    }
  }, VOLUME_RAMP_MS / VOLUME_RAMP_STEPS)
  volumeRampTimer = timer
}

function syncVolumeNormalization(mk: MusicKit.MusicKitInstance) {
  const items = mk.queue?.items ?? []
  const position = mk.queue?.position ?? 0
  normalizeNowPlaying(mk.nowPlayingItem, items.slice(position + 1))
}

/** Start or bypass the experimental stable-volume audio processing. */
function syncStableVolume() {
  const { stableVolume } = useVolumeNormalizationStore.getState()
  if (!stableVolume) {
    setStableVolumeCompression(false)
    return
  }
  const started = startAudioProcessing({
    onActiveChange: () => {
      const mk = getMusicKitInstance()
      if (mk) applyMusicKitVolume(mk)
    },
    onSilence: () => {
      useVolumeNormalizationStore.getState().markStableVolumeFailed()
      usePlayerStore.setState({
        playbackError: {
          title: 'Stable volume is not supported here',
          message:
            "This browser doesn't let Musictron process Apple Music audio, so stable volume has been turned off. If playback stays silent, reload Musictron.",
        },
      })
    },
  })
  if (!started) {
    // No Web Audio, or it already failed this session.
    useVolumeNormalizationStore.setState({ stableVolume: false })
    return
  }
  const mk = getMusicKitInstance()
  if (mk) applyMusicKitVolume(mk)
}

// Re-apply the volume whenever the normalization gain changes (new track
// measured, setting toggled, target level changed).
useVolumeNormalizationStore.subscribe((state, previous) => {
  if (state.stableVolume !== previous.stableVolume) syncStableVolume()
  const mk = getMusicKitInstance()
  if (!mk) return
  if (state.enabled && !previous.enabled) syncVolumeNormalization(mk)
  if (selectNormalizationGain(state) !== selectNormalizationGain(previous)) {
    // A new track starts at its own level; fade only when the level changes
    // mid-track (measurement finished, setting changed).
    const sameTrack = state.track?.songId === previous.track?.songId
    applyMusicKitVolume(mk, { ramp: sameTrack })
  }
})

let previewFallbackTimer: ReturnType<typeof setTimeout> | null = null

function schedulePreviewFallbackCheck() {
  if (previewFallbackTimer) clearTimeout(previewFallbackTimer)
  previewFallbackTimer = setTimeout(() => {
    previewFallbackTimer = null
    void detectPreviewFallback()
  }, 750)
}

async function detectPreviewFallback() {
  const mk = getMusicKitInstance()
  const item = mk?.nowPlayingItem
  if (!mk || !item) return

  const catalogDuration = (item.attributes.durationInMillis || 0) / 1000
  const playbackDuration = mk.currentPlaybackDuration || 0

  if (playbackDuration <= 0 || playbackDuration > 31 || catalogDuration <= 31) {
    return
  }

  if (!mk.isAuthorized) {
    usePlayerStore.setState({
      playbackError: {
        title: 'Sign in required',
        message:
          'Apple Music is playing previews because this session is not authorized.',
      },
    })
    return
  }

  const support = await getBrowserPlaybackSupport()

  if (!support.isSecureContext) {
    usePlayerStore.setState({
      playbackError: {
        title: 'Protected playback is unavailable',
        message:
          'Full Apple Music playback requires a secure browser context. Use localhost or HTTPS.',
      },
    })
    return
  }

  if (
    !support.hasMediaKeySystemAccess ||
    support.supportedKeySystems.length === 0
  ) {
    usePlayerStore.setState({
      playbackError: {
        title: 'DRM is not available',
        message:
          'This browser cannot play protected Apple Music streams, so only previews are available. Use Chrome, Edge, or Safari with protected content enabled.',
      },
    })
    return
  }

  usePlayerStore.setState({
    playbackError: {
      title: 'Only previews are available',
      message:
        'Apple Music returned a preview stream for this account or track. Check your subscription, region, and protected content settings.',
    },
  })
}

/**
 * Find a song's position in a MusicKit queue. MusicKit drops unplayable songs
 * when building a queue, so the index the UI passed (`hint`) can only be at or
 * past the real one. Prefer the closest match at or before `hint` so duplicate
 * songs in a list resolve to the occurrence that was clicked.
 */
export function findQueueIndex(
  items: MusicKit.MediaItem[],
  songId: string | undefined,
  hint: number,
): number {
  if (!songId) return -1

  let match = -1
  items.forEach((item, index) => {
    const playParams = item.attributes?.playParams
    const matches =
      item.id === songId ||
      playParams?.id === songId ||
      playParams?.catalogId === songId
    if (matches && (match === -1 || index <= hint)) match = index
  })
  return match
}

/**
 * Index of the row in `trackIds` that is playing, or -1. When the queue was
 * started from this list (`contextKey`), a repeated song resolves to the
 * occurrence the queue is on; otherwise to its first occurrence.
 */
export function findPlayingTrackIndex(
  trackIds: string[],
  contextKey: string,
  state: Pick<
    PlayerState,
    'nowPlaying' | 'queue' | 'queuePosition' | 'playContext' | 'shuffleMode'
  >,
): number {
  const { nowPlaying, queue, queuePosition, playContext, shuffleMode } = state
  if (!nowPlaying) return -1

  if (
    playContext?.key === contextKey &&
    shuffleMode === 0 &&
    queue[queuePosition]?.id === nowPlaying.id
  ) {
    // The queue is the list from `offset` on, minus songs MusicKit couldn't
    // play. Such a song is dropped at every occurrence, so pairing queue
    // entries with the list in order finds each entry's row.
    let trackIndex = playContext.offset - 1
    for (let i = 0; i <= queuePosition; i++) {
      trackIndex = trackIds.indexOf(queue[i].id, trackIndex + 1)
      if (trackIndex === -1) break
    }
    if (trackIndex !== -1) return trackIndex
  }

  return trackIds.indexOf(nowPlaying.id)
}

export function getPlaybackErrorMessage(error: unknown): PlaybackError {
  const message =
    error instanceof Error ? error.message : safeStringifyError(error)

  if (
    /musickit.*not.*(configured|initialized)|not.*configured/i.test(message)
  ) {
    return {
      title: 'Apple Music is not ready',
      message:
        'MusicKit has not finished loading or configuring yet. Try again in a moment.',
    }
  }

  if (
    /setServerCertificate|key.?system|media.?key|widevine|drm/i.test(message)
  ) {
    return {
      title: 'DRM playback failed',
      message:
        'Apple Music could not initialize protected playback. Check protected content or Widevine support in this browser.',
    }
  }

  if (/unauthori[sz]ed|forbidden|401|403/i.test(message)) {
    return {
      title: 'Apple Music authorization failed',
      message:
        'Your Apple Music session was rejected. Sign out and sign in again, then retry playback.',
    }
  }

  if (/network|fetch|load|timeout|proxy|certificate/i.test(message)) {
    return {
      title: 'Playback network error',
      message:
        'Apple Music could not load a required playback resource. Check proxy, VPN, and content-blocking settings.',
    }
  }

  return {
    title: 'Playback failed',
    message: message || 'Apple Music could not start playback.',
  }
}

function safeStringifyError(error: unknown): string {
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function setMusicKitEventError(
  title: string,
  message: string,
  event?: unknown,
) {
  logMusicKitDebug('player.playback-error-event', {
    title,
    message,
    event: safeStringifyError(event),
  })
  usePlayerStore.setState({
    isPlaying: false,
    playbackError: { title, message },
  })
}

// Track the instance we've bound listeners to (plus the handler refs) so this
// can run again after a token re-configure without double-binding every event.
let boundInstance: MusicKit.MusicKitInstance | null = null
let boundHandlers: {
  nowPlayingItemWillChange: (event?: { item?: MusicKit.MediaItem }) => void
  nowPlayingItemDidChange: () => void
  playbackStateDidChange: (event: { state?: number } | number) => void
  queueItemsDidChange: () => void
  queuePositionDidChange: () => void
  mediaPlaybackError: (event?: unknown) => void
  playbackLicenseError: (event?: unknown) => void
  keySystemGenericError: (event?: unknown) => void
} | null = null

// Set up MusicKit event listeners. Idempotent: a repeat call for the same
// instance only refreshes the volume; for a new instance it detaches the old
// listeners first.
export function initializePlayerEvents() {
  const mk = getMusicKitInstance()
  if (!mk) return

  // Already bound to this instance — nothing to re-wire.
  if (boundInstance === mk) {
    applyMusicKitVolume(mk)
    return
  }

  // Bound to a previous instance — detach its listeners before re-binding.
  if (boundInstance && boundHandlers) {
    boundInstance.removeEventListener(
      'nowPlayingItemWillChange',
      boundHandlers.nowPlayingItemWillChange,
    )
    boundInstance.removeEventListener(
      'nowPlayingItemDidChange',
      boundHandlers.nowPlayingItemDidChange,
    )
    boundInstance.removeEventListener(
      'playbackStateDidChange',
      boundHandlers.playbackStateDidChange,
    )
    boundInstance.removeEventListener(
      'queueItemsDidChange',
      boundHandlers.queueItemsDidChange,
    )
    boundInstance.removeEventListener(
      'queuePositionDidChange',
      boundHandlers.queuePositionDidChange,
    )
    boundInstance.removeEventListener(
      'mediaPlaybackError',
      boundHandlers.mediaPlaybackError,
    )
    boundInstance.removeEventListener(
      'playbackLicenseError',
      boundHandlers.playbackLicenseError,
    )
    boundInstance.removeEventListener(
      'keySystemGenericError',
      boundHandlers.keySystemGenericError,
    )
  }

  const handlers = {
    // Fires synchronously before the switch: set the next track's level now
    // so a loud song doesn't start at the previous song's level.
    nowPlayingItemWillChange: (event?: { item?: MusicKit.MediaItem }) => {
      if (event?.item) normalizeNowPlaying(event.item)
    },
    nowPlayingItemDidChange: () => {
      // Defer sync slightly — MusicKit may not have updated nowPlayingItem yet
      // when this event fires, causing stale reads
      setTimeout(() => {
        usePlayerStore.getState()._syncFromMusicKit()
      }, 50)
    },
    playbackStateDidChange: (event: { state?: number } | number) => {
      const state = typeof event === 'number' ? event : (event?.state ?? event)
      usePlayerStore.setState({
        isPlaying: state === 2,
      })

      if (state === 2) {
        usePlayerStore.getState()._startTimeUpdater()
      } else {
        usePlayerStore.getState()._stopTimeUpdater()
      }
    },
    queueItemsDidChange: () => {
      usePlayerStore.getState()._syncFromMusicKit()
    },
    queuePositionDidChange: () => {
      usePlayerStore.getState()._syncFromMusicKit()
    },
    mediaPlaybackError: (event?: unknown) => {
      setMusicKitEventError(
        'Playback failed',
        'Apple Music could not continue playback for this track.',
        event,
      )
    },
    playbackLicenseError: (event?: unknown) => {
      setMusicKitEventError(
        'Playback license failed',
        'Apple Music could not fetch a protected playback license. Check proxy, VPN, and content-blocking settings.',
        event,
      )
    },
    keySystemGenericError: (event?: unknown) => {
      setMusicKitEventError(
        'DRM playback failed',
        'This browser could not initialize Apple Music protected playback. Enable protected content or use a browser with Widevine/FairPlay support.',
        event,
      )
    },
  }

  mk.addEventListener(
    'nowPlayingItemWillChange',
    handlers.nowPlayingItemWillChange,
  )
  mk.addEventListener(
    'nowPlayingItemDidChange',
    handlers.nowPlayingItemDidChange,
  )
  mk.addEventListener('playbackStateDidChange', handlers.playbackStateDidChange)
  mk.addEventListener('queueItemsDidChange', handlers.queueItemsDidChange)
  mk.addEventListener('queuePositionDidChange', handlers.queuePositionDidChange)
  mk.addEventListener('mediaPlaybackError', handlers.mediaPlaybackError)
  mk.addEventListener('playbackLicenseError', handlers.playbackLicenseError)
  mk.addEventListener('keySystemGenericError', handlers.keySystemGenericError)

  boundInstance = mk
  boundHandlers = handlers

  // Set initial volume
  applyMusicKitVolume(mk)
  syncStableVolume()
}
