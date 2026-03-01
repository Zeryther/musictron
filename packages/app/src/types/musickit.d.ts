/**
 * MusicKit JS type declarations.
 *
 * These are hand-written minimal types for the subset of the MusicKit JS v3
 * API that Musictron uses.  They used to live in `vite-env.d.ts` in the
 * desktop app — now they live here so every host can share them.
 */

interface Window {
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
    music(
      path: string,
      queryParameters?: Record<string, any>,
    ): Promise<APIResponse>
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

  /** Attributes common to Apple Music API resources */
  interface ResourceAttributes {
    name?: string
    artistName?: string
    albumName?: string
    curatorName?: string
    artwork?: Artwork
    durationInMillis?: number
    trackNumber?: number
    discNumber?: number
    releaseDate?: string
    genreNames?: string[]
    contentRating?: string
    trackCount?: number
    editorialNotes?: { short?: string; standard?: string }
    description?: { short?: string; standard?: string }
    isComplete?: boolean
    canEdit?: boolean
    playParams?: { id: string; kind: string; catalogId?: string }
    title?: { stringForDisplay?: string }
    reason?: { stringForDisplay?: string }
    lastModifiedDate?: string
    url?: string
    isrc?: string
    [key: string]: unknown
  }

  /** Generic resource returned by the Apple Music API */
  interface Resource {
    id: string
    type: string
    href?: string
    attributes?: ResourceAttributes
    relationships?: Record<string, { data?: Resource[]; next?: string }>
  }

  /** A chart group returned within results (e.g., results.songs[0]) */
  interface ChartGroup {
    data: Resource[]
    name?: string
    chart?: string
    next?: string
  }

  /** Response shape returned by musicAPI() helper after unwrapping */
  interface APIResponseData {
    data?: Resource[]
    results?: APIResultsMap
    meta?: Record<string, unknown>
    next?: string
  }

  /**
   * Union results type — endpoints return either chart-style or search-style
   * results. Consumers should narrow at the call site.
   */
  interface APIResultsMap {
    songs?: ChartGroup[] | SearchResultList
    albums?: ChartGroup[] | SearchResultList
    artists?: ChartGroup[] | SearchResultList
    playlists?: ChartGroup[] | SearchResultList
    terms?: string[]
    [key: string]: ChartGroup[] | SearchResultList | string[] | undefined
  }

  /**
   * Results from chart endpoints (e.g. /charts).
   * Each key maps to an array of chart groups.
   */
  interface ChartResults {
    songs?: ChartGroup[]
    albums?: ChartGroup[]
    playlists?: ChartGroup[]
    [key: string]: ChartGroup[] | undefined
  }

  /**
   * Results from search endpoints (e.g. /search).
   * Each key maps to a search result list.
   */
  interface SearchResults {
    songs?: SearchResultList
    albums?: SearchResultList
    artists?: SearchResultList
    playlists?: SearchResultList
    terms?: string[]
    [key: string]: SearchResultList | string[] | undefined
  }

  /** Search result for a single media type */
  interface SearchResultList {
    data: Resource[]
    next?: string
  }

  /** Individual chart group entry */
  interface ChartGroup {
    data: Resource[]
    name?: string
    chart?: string
    next?: string
  }
}
