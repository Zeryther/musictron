import type { NowPlayingItem } from '@/stores/player-store'

let counter = 0
function nextId(prefix: string): string {
  counter += 1
  return `${prefix}.${counter}`
}

const ARTWORK: MusicKit.Artwork = {
  url: 'https://example.com/art/{w}x{h}.jpg',
  width: 1000,
  height: 1000,
}

export function makeSong(
  overrides: Partial<MusicKit.Resource> = {},
): MusicKit.Resource {
  const { attributes, ...rest } = overrides
  return {
    id: nextId('song'),
    type: 'songs',
    attributes: {
      name: 'Test Song',
      artistName: 'Test Artist',
      albumName: 'Test Album',
      durationInMillis: 200_000,
      artwork: ARTWORK,
      ...attributes,
    },
    ...rest,
  }
}

export function makeAlbum(
  overrides: Partial<MusicKit.Resource> = {},
): MusicKit.Resource {
  const { attributes, ...rest } = overrides
  return {
    id: nextId('album'),
    type: 'albums',
    attributes: {
      name: 'Test Album',
      artistName: 'Test Artist',
      artwork: ARTWORK,
      trackCount: 10,
      ...attributes,
    },
    ...rest,
  }
}

export function makePlaylist(
  overrides: Partial<MusicKit.Resource> = {},
): MusicKit.Resource {
  const { attributes, ...rest } = overrides
  return {
    id: nextId('playlist'),
    type: 'playlists',
    attributes: {
      name: 'Test Playlist',
      curatorName: 'Test Curator',
      artwork: ARTWORK,
      ...attributes,
    },
    ...rest,
  }
}

export function makeMediaItem(
  overrides: Partial<MusicKit.MediaItem> = {},
): MusicKit.MediaItem {
  const { attributes, ...rest } = overrides
  return {
    id: nextId('media'),
    type: 'songs',
    attributes: {
      name: 'Test Song',
      artistName: 'Test Artist',
      albumName: 'Test Album',
      artwork: ARTWORK,
      durationInMillis: 200_000,
      ...attributes,
    },
    ...rest,
  }
}

export function makeNowPlayingItem(
  overrides: Partial<NowPlayingItem> = {},
): NowPlayingItem {
  return {
    id: nextId('np'),
    name: 'Test Song',
    artistName: 'Test Artist',
    albumName: 'Test Album',
    artworkUrl: 'https://example.com/art/600x600.jpg',
    duration: 200,
    ...overrides,
  }
}
