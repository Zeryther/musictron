/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getPlatform: () => Promise<string>
    getTheme: () => Promise<string>
    setTitle: (title: string) => void
    windowMinimize: () => Promise<void>
    windowMaximize: () => Promise<void>
    windowIsMaximized: () => Promise<boolean>
    windowClose: () => Promise<void>
    onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void
    onMediaKey: (callback: (key: string) => void) => () => void
  }
  MusicKit: typeof MusicKit
}

declare namespace MusicKit {
  function configure(config: {
    developerToken: string
    app: {
      name: string
      build?: string
      icon?: string
    }
  }): Promise<MusicKitInstance>

  function getInstance(): MusicKitInstance

  interface MusicKitInstance {
    authorize(): Promise<string>
    unauthorize(): Promise<void>
    isAuthorized: boolean
    musicUserToken: string
    developerToken: string
    storefrontId: string
    storefrontCountryCode: string
    volume: number
    playbackState: PlaybackStates
    currentPlaybackTime: number
    currentPlaybackDuration: number
    nowPlayingItem: MediaItem | null
    queue: Queue
    repeatMode: PlayerRepeatMode
    shuffleMode: PlayerShuffleMode
    play(): Promise<void>
    pause(): void
    stop(): void
    skipToNextItem(): Promise<void>
    skipToPreviousItem(): Promise<void>
    seekToTime(time: number): Promise<void>
    setQueue(options: SetQueueOptions): Promise<Queue>
    api: API
    addEventListener(event: string, callback: (...args: any[]) => void): void
    removeEventListener(event: string, callback: (...args: any[]) => void): void
  }

  interface API {
    music(path: string, queryParameters?: Record<string, any>): Promise<APIResponse>
  }

  interface APIResponse {
    data: {
      data?: any[]
      results?: Record<string, any>
      meta?: Record<string, any>
      next?: string
    }
  }

  interface MediaItem {
    id: string
    type: string
    attributes: {
      name: string
      artistName: string
      albumName: string
      artwork: Artwork
      durationInMillis: number
      playParams?: {
        id: string
        kind: string
        catalogId?: string
      }
      contentRating?: string
      trackNumber?: number
      discNumber?: number
      releaseDate?: string
      genreNames?: string[]
      isrc?: string
      url?: string
    }
    relationships?: Record<string, any>
  }

  interface Artwork {
    url: string
    width: number
    height: number
    bgColor?: string
    textColor1?: string
    textColor2?: string
    textColor3?: string
    textColor4?: string
  }

  interface Queue {
    items: MediaItem[]
    position: number
    length: number
    isEmpty: boolean
    nextPlayableItem: MediaItem | null
    previousPlayableItem: MediaItem | null
  }

  interface SetQueueOptions {
    song?: string
    songs?: string[]
    album?: string
    playlist?: string
    startWith?: number
    startPlaying?: boolean
    url?: string
  }

  enum PlaybackStates {
    none = 0,
    loading = 1,
    playing = 2,
    paused = 3,
    stopped = 4,
    ended = 5,
    seeking = 6,
    waiting = 8,
    stalled = 9,
    completed = 10,
  }

  enum PlayerRepeatMode {
    none = 0,
    one = 1,
    all = 2,
  }

  enum PlayerShuffleMode {
    off = 0,
    songs = 1,
  }
}
