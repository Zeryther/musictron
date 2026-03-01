import { useState, useEffect, useCallback } from 'react'
import { musicAPI } from '@/lib/musickit'

// Generic hook for fetching data from Apple Music API
export function useMusicKitAPI<T>(
  path: string | null,
  params?: Record<string, string | number | boolean>,
  transform?: (data: MusicKit.APIResponseData) => T,
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!path) return
    try {
      setLoading(true)
      setError(null)
      const response = await musicAPI(path, params)
      const result = transform ? transform(response) : (response as T)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [path, JSON.stringify(params)])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Helpers for common data shapes
export interface AlbumData {
  id: string
  name: string
  artistName: string
  artworkUrl: string
  releaseDate?: string
  trackCount?: number
  genreNames?: string[]
  editorialNotes?: string
  isComplete?: boolean
}

export interface SongData {
  id: string
  name: string
  artistName: string
  albumName: string
  artworkUrl: string
  duration: number
  trackNumber?: number
  discNumber?: number
}

export interface ArtistData {
  id: string
  name: string
  artworkUrl: string
  genreNames?: string[]
}

export interface PlaylistData {
  id: string
  name: string
  curatorName?: string
  description?: string
  artworkUrl: string
  lastModifiedDate?: string
}

export function transformAlbum(item: MusicKit.Resource): AlbumData {
  return {
    id: item.id,
    name: item.attributes?.name || '',
    artistName: item.attributes?.artistName || '',
    artworkUrl: item.attributes?.artwork?.url || '',
    releaseDate: item.attributes?.releaseDate,
    trackCount: item.attributes?.trackCount,
    genreNames: item.attributes?.genreNames,
    editorialNotes:
      item.attributes?.editorialNotes?.short ||
      item.attributes?.editorialNotes?.standard,
    isComplete: item.attributes?.isComplete,
  }
}

export function transformSong(item: MusicKit.Resource): SongData {
  return {
    id: item.id,
    name: item.attributes?.name || '',
    artistName: item.attributes?.artistName || '',
    albumName: item.attributes?.albumName || '',
    artworkUrl: item.attributes?.artwork?.url || '',
    duration: item.attributes?.durationInMillis || 0,
    trackNumber: item.attributes?.trackNumber,
    discNumber: item.attributes?.discNumber,
  }
}

export function transformPlaylist(item: MusicKit.Resource): PlaylistData {
  return {
    id: item.id,
    name: item.attributes?.name || '',
    curatorName: item.attributes?.curatorName,
    description:
      item.attributes?.description?.short ||
      item.attributes?.description?.standard,
    artworkUrl: item.attributes?.artwork?.url || '',
    lastModifiedDate: item.attributes?.lastModifiedDate,
  }
}

export function transformArtist(item: MusicKit.Resource): ArtistData {
  return {
    id: item.id,
    name: item.attributes?.name || '',
    artworkUrl: item.attributes?.artwork?.url || '',
    genreNames: item.attributes?.genreNames,
  }
}

// Specific hooks
export function useBrowseCharts() {
  return useMusicKitAPI('/v1/catalog/{{storefrontId}}/charts', {
    types: 'songs,albums,playlists',
    limit: 20,
  })
}

export function useSearch(query: string) {
  return useMusicKitAPI(query ? `/v1/catalog/{{storefrontId}}/search` : null, {
    term: query,
    types: 'songs,albums,artists,playlists',
    limit: 10,
  })
}

export function useAlbumDetail(albumId: string | undefined) {
  return useMusicKitAPI(
    albumId ? `/v1/catalog/{{storefrontId}}/albums/${albumId}` : null,
    {
      include: 'tracks',
    },
  )
}

export function usePlaylistDetail(playlistId: string | undefined) {
  return useMusicKitAPI(
    playlistId
      ? playlistId.startsWith('p.')
        ? `/v1/me/library/playlists/${playlistId}`
        : `/v1/catalog/{{storefrontId}}/playlists/${playlistId}`
      : null,
    {
      include: 'tracks',
    },
  )
}

export function useArtistDetail(artistId: string | undefined) {
  return useMusicKitAPI(
    artistId ? `/v1/catalog/{{storefrontId}}/artists/${artistId}` : null,
    {
      include: 'albums,playlists',
      'include[albums]': 'tracks',
    },
  )
}

export function useLibrarySongs(offset: number = 0) {
  return useMusicKitAPI('/v1/me/library/songs', {
    limit: 100,
    offset,
    sort: '-dateAdded',
  })
}

export function useLibraryAlbums(offset: number = 0) {
  return useMusicKitAPI('/v1/me/library/albums', {
    limit: 100,
    offset,
    sort: '-dateAdded',
  })
}

export function useLibraryArtists(offset: number = 0) {
  return useMusicKitAPI('/v1/me/library/artists', {
    limit: 100,
    offset,
  })
}

export function useRecommendations() {
  return useMusicKitAPI('/v1/me/recommendations', {
    limit: 10,
  })
}

export function useRecentlyPlayed() {
  return useMusicKitAPI('/v1/me/recent/played', {
    limit: 10,
  })
}
