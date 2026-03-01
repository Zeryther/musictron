import { useQuery } from '@tanstack/react-query'
import { musicAPI } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'

/**
 * Fetch an artist's core data + albums relationship.
 */
export function useArtistDetail(artistId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artists.detail(artistId ?? ''),
    queryFn: async () => {
      const data = await musicAPI(
        `/v1/catalog/{{storefrontId}}/artists/${artistId}`,
        { include: 'albums' },
      )
      const artist = data.data?.[0] ?? null
      const albums: MusicKit.Resource[] =
        artist?.relationships?.albums?.data || []
      return { artist, albums }
    },
    enabled: !!artistId,
  })
}

/**
 * Fetch an artist's top songs.
 */
export function useArtistTopSongs(artistId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artists.topSongs(artistId ?? ''),
    queryFn: async () => {
      const data = await musicAPI(
        `/v1/catalog/{{storefrontId}}/artists/${artistId}/view/top-songs`,
        { limit: 20 },
      )
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled: !!artistId,
  })
}

/**
 * Fetch an artist's featured playlists.
 */
export function useArtistPlaylists(artistId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artists.playlists(artistId ?? ''),
    queryFn: async () => {
      const data = await musicAPI(
        `/v1/catalog/{{storefrontId}}/artists/${artistId}/view/featured-playlists`,
        { limit: 10 },
      )
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled: !!artistId,
  })
}
