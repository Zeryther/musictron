import { create } from 'zustand'
import { getMusicKitInstance } from '@/lib/musickit'
import { formatArtworkUrl } from '@/lib/utils'

export interface NowPlayingItem {
  id: string
  name: string
  artistName: string
  albumName: string
  artworkUrl: string
  duration: number
  artworkColors?: {
    bg: string
    text1: string
    text2: string
  }
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

  // Queue management
  playTrack: (trackId: string, options?: { startPlaying?: boolean }) => Promise<void>
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

export const usePlayerStore = create<PlayerState>()((set, get) => ({
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

  play: async () => {
    const mk = getMusicKitInstance()
    if (mk) {
      await mk.play()
      set({ isPlaying: true })
      get()._startTimeUpdater()
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

  playTrack: async (trackId: string, options?: { startPlaying?: boolean }) => {
    const mk = getMusicKitInstance()
    if (mk) {
      await mk.setQueue({ song: trackId, startPlaying: options?.startPlaying ?? true })
      get()._syncFromMusicKit()
      get()._startTimeUpdater()
    }
  },

  playAlbum: async (albumId: string, startIndex: number = 0) => {
    const mk = getMusicKitInstance()
    if (mk) {
      await mk.setQueue({ album: albumId, startWith: startIndex, startPlaying: true })
      get()._syncFromMusicKit()
      get()._startTimeUpdater()
    }
  },

  playPlaylist: async (playlistId: string, startIndex: number = 0) => {
    const mk = getMusicKitInstance()
    if (mk) {
      await mk.setQueue({ playlist: playlistId, startWith: startIndex, startPlaying: true })
      get()._syncFromMusicKit()
      get()._startTimeUpdater()
    }
  },

  playSongs: async (songIds: string[], startIndex: number = 0) => {
    const mk = getMusicKitInstance()
    if (mk) {
      await mk.setQueue({ songs: songIds, startWith: startIndex, startPlaying: true })
      get()._syncFromMusicKit()
      get()._startTimeUpdater()
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
      const nowPlaying: NowPlayingItem = {
        id: item.id,
        name: item.attributes.name,
        artistName: item.attributes.artistName,
        albumName: item.attributes.albumName,
        artworkUrl: formatArtworkUrl(item.attributes.artwork?.url, 600),
        duration: (item.attributes.durationInMillis || 0) / 1000,
        artworkColors: item.attributes.artwork
          ? {
              bg: `#${item.attributes.artwork.bgColor || '1a1a1a'}`,
              text1: `#${item.attributes.artwork.textColor1 || 'ffffff'}`,
              text2: `#${item.attributes.artwork.textColor2 || 'cccccc'}`,
            }
          : undefined,
      }
      set({ nowPlaying })
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
}))

// Set up MusicKit event listeners
export function initializePlayerEvents() {
  const mk = getMusicKitInstance()
  if (!mk) return

  const store = usePlayerStore.getState()

  mk.addEventListener('nowPlayingItemDidChange', () => {
    store._syncFromMusicKit()
  })

  mk.addEventListener('playbackStateDidChange', (event: any) => {
    const state = event?.state ?? event
    usePlayerStore.setState({
      isPlaying: state === 2,
    })

    if (state === 2) {
      store._startTimeUpdater()
    } else {
      store._stopTimeUpdater()
    }
  })

  mk.addEventListener('queueItemsDidChange', () => {
    store._syncFromMusicKit()
  })

  mk.addEventListener('queuePositionDidChange', () => {
    store._syncFromMusicKit()
  })

  // Set initial volume
  mk.volume = store.volume
}
