import { useQuery } from '@tanstack/react-query'
import { musicAPI } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'

/**
 * Fetch a single album by ID (catalog or library).
 * Library album IDs start with `l.`.
 */
export function useAlbumDetail(albumId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.albums.detail(albumId ?? ''),
    queryFn: async () => {
      const isLibrary = albumId!.startsWith('l.')
      const path = isLibrary
        ? `/v1/me/library/albums/${albumId}`
        : `/v1/catalog/{{storefrontId}}/albums/${albumId}`

      const data = await musicAPI(path, { include: 'tracks,artists' })
      const album = data.data?.[0] ?? null
      const tracks: MusicKit.Resource[] =
        album?.relationships?.tracks?.data || []
      const artists: MusicKit.Resource[] =
        album?.relationships?.artists?.data || []
      return { album, tracks, artists }
    },
    enabled: !!albumId,
  })
}
