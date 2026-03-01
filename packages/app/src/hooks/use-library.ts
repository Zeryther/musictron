import { useQuery } from '@tanstack/react-query'
import { musicAPI } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'

/**
 * Fetch library songs with pagination offset.
 */
export function useLibrarySongs(offset: number = 0, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.library.songs(offset),
    queryFn: async () => {
      const data = await musicAPI('/v1/me/library/songs', {
        limit: 100,
        offset,
        sort: '-dateAdded',
      })
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled,
  })
}

/**
 * Fetch library albums with pagination offset.
 */
export function useLibraryAlbums(offset: number = 0, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.library.albums(offset),
    queryFn: async () => {
      const data = await musicAPI('/v1/me/library/albums', {
        limit: 100,
        offset,
        sort: '-dateAdded',
      })
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled,
  })
}

/**
 * Fetch library artists with pagination offset.
 */
export function useLibraryArtists(
  offset: number = 0,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: queryKeys.library.artists(offset),
    queryFn: async () => {
      const data = await musicAPI('/v1/me/library/artists', {
        limit: 100,
        offset,
      })
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled,
  })
}

/**
 * Fetch recently-added items from the user's library.
 */
export function useLibraryRecentlyAdded(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.library.recentlyAdded(),
    queryFn: async () => {
      const data = await musicAPI('/v1/me/library/recently-added', {
        limit: 30,
      })
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled,
  })
}
