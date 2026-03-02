import { useQuery } from '@tanstack/react-query'
import { musicAPI } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'

/** Library artist IDs start with `r.` */
function isLibraryArtistId(id: string): boolean {
  return id.startsWith('r.')
}

/**
 * Resolve a library artist ID to its catalog counterpart.
 * Returns the catalog artist ID, or null if there's no catalog match.
 */
async function resolveCatalogArtistId(
  libraryId: string,
): Promise<string | null> {
  try {
    const data = await musicAPI(`/v1/me/library/artists/${libraryId}/catalog`)
    return data.data?.[0]?.id ?? null
  } catch {
    return null
  }
}

/**
 * Fetch an artist's core data + albums relationship.
 *
 * Accepts both catalog IDs (numeric) and library IDs (`r.*`).
 * Library IDs are resolved to catalog IDs first via the catalog relationship.
 */
export function useArtistDetail(artistId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artists.detail(artistId ?? ''),
    queryFn: async () => {
      let catalogId = artistId ?? ''

      if (isLibraryArtistId(catalogId)) {
        const resolved = await resolveCatalogArtistId(catalogId)
        if (!resolved) return { artist: null, albums: [], catalogId: null }
        catalogId = resolved
      }

      const data = await musicAPI(
        `/v1/catalog/{{storefrontId}}/artists/${catalogId}`,
        { include: 'albums' },
      )
      const artist = data.data?.[0] ?? null
      const albums: MusicKit.Resource[] =
        artist?.relationships?.albums?.data || []
      return { artist, albums, catalogId }
    },
    enabled: !!artistId,
  })
}

/**
 * Fetch an artist's top songs.
 *
 * Accepts both catalog IDs and library IDs. Library IDs are resolved first.
 */
export function useArtistTopSongs(artistId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artists.topSongs(artistId ?? ''),
    queryFn: async () => {
      let catalogId = artistId ?? ''

      if (isLibraryArtistId(catalogId)) {
        const resolved = await resolveCatalogArtistId(catalogId)
        if (!resolved) return []
        catalogId = resolved
      }

      const data = await musicAPI(
        `/v1/catalog/{{storefrontId}}/artists/${catalogId}/view/top-songs`,
        { limit: 20 },
      )
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled: !!artistId,
  })
}

/**
 * Fetch an artist's featured playlists.
 *
 * Accepts both catalog IDs and library IDs. Library IDs are resolved first.
 */
export function useArtistPlaylists(artistId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.artists.playlists(artistId ?? ''),
    queryFn: async () => {
      let catalogId = artistId ?? ''

      if (isLibraryArtistId(catalogId)) {
        const resolved = await resolveCatalogArtistId(catalogId)
        if (!resolved) return []
        catalogId = resolved
      }

      const data = await musicAPI(
        `/v1/catalog/{{storefrontId}}/artists/${catalogId}/view/featured-playlists`,
        { limit: 10 },
      )
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled: !!artistId,
  })
}
