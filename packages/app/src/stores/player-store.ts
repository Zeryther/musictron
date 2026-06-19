import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getBrowserPlaybackSupport,
  getMusicKitInstance,
  logMusicKitDebug,
  musicAPI,
} from '@/lib/musickit'
import { formatArtworkUrl } from '@/lib/utils'

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
  playSongs: (songIds: string[], startIndex?: number) => Promise<void>
  addToQueue: (songId: string) => Promise<void>
  playNext: (songId: string) => Promise<void>

  // Internal
  _syncFromMusicKit: () => void
  _startTimeUpdater: () => void
  _stopTimeUpdater: () => void
}

let timeUpdateInterval: ReturnType<typeof setInterval> | null = null

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
      repeatMode: 0,
      shuffleMode: 0,
      isQueueOpen: false,
      isFullscreen: false,
      playbackError: null,

      play: async () => {
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
          mk.volume = volume
          set({ volume })
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
        const mk = getMusicKitInstance()
        if (mk) {
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
            get()._syncFromMusicKit()
            get()._startTimeUpdater()
            schedulePreviewFallbackCheck()
          } catch (error) {
            set({ playbackError: getPlaybackErrorMessage(error) })
          }
        }
      },

      playAlbum: async (albumId: string, startIndex: number = 0) => {
        const mk = getMusicKitInstance()
        if (mk) {
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
            get()._syncFromMusicKit()
            get()._startTimeUpdater()
            schedulePreviewFallbackCheck()
          } catch (error) {
            set({ playbackError: getPlaybackErrorMessage(error) })
          }
        }
      },

      playPlaylist: async (playlistId: string, startIndex: number = 0) => {
        const mk = getMusicKitInstance()
        if (mk) {
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
            get()._syncFromMusicKit()
            get()._startTimeUpdater()
            schedulePreviewFallbackCheck()
          } catch (error) {
            set({ playbackError: getPlaybackErrorMessage(error) })
          }
        }
      },

      playSongs: async (songIds: string[], startIndex: number = 0) => {
        const mk = getMusicKitInstance()
        if (mk) {
          logMusicKitDebug('player.playSongs.before-setQueue', {
            songCount: songIds.length,
            firstSongId: songIds[0],
            startIndex,
          })
          try {
            set({ playbackError: null })
            await mk.setQueue({
              songs: songIds,
              startWith: startIndex,
              startPlaying: true,
            })
            logMusicKitDebug('player.playSongs.after-setQueue')
            get()._syncFromMusicKit()
            get()._startTimeUpdater()
            schedulePreviewFallbackCheck()
          } catch (error) {
            set({ playbackError: getPlaybackErrorMessage(error) })
          }
        }
      },

      addToQueue: async (songId: string) => {
        const mk = getMusicKitInstance()
        if (mk) {
          // MusicKit v3 queue management
          await mk.setQueue({ song: songId })
          get()._syncFromMusicKit()
        }
      },

      playNext: async (songId: string) => {
        const mk = getMusicKitInstance()
        if (mk) {
          await mk.setQueue({ song: songId })
          get()._syncFromMusicKit()
        }
      },

      _syncFromMusicKit: () => {
        const mk = getMusicKitInstance()
        if (!mk) return

        const item = mk.nowPlayingItem
        if (item) {
          // Parse album ID from the Apple Music URL if available.
          // URLs look like: https://music.apple.com/us/album/{slug}/{albumId}?i={songId}
          let albumId: string | undefined
          if (item.attributes.url) {
            const match = item.attributes.url.match(/\/album\/[^/]+\/(\d+)/)
            if (match) albumId = match[1]
          }

          const nowPlaying: NowPlayingItem = {
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
          set({ nowPlaying })

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

        set({
          queue: queueItems,
          queuePosition: mk.queue?.position || 0,
          isPlaying: mk.playbackState === 2, // playing
          duration: mk.currentPlaybackDuration || 0,
          volume: mk.volume,
        })
      },

      _startTimeUpdater: () => {
        get()._stopTimeUpdater()
        timeUpdateInterval = setInterval(() => {
          const mk = getMusicKitInstance()
          if (mk) {
            // Detect track changes that event listeners may have missed
            const currentId = get().nowPlaying?.id
            const mkItemId = mk.nowPlayingItem?.id
            if (mkItemId && mkItemId !== currentId) {
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
    mk.volume = usePlayerStore.getState().volume
    return
  }

  // Bound to a previous instance — detach its listeners before re-binding.
  if (boundInstance && boundHandlers) {
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
  mk.volume = usePlayerStore.getState().volume
}
