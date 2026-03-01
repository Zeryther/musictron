import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
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
 * Library artist with resolved catalog info for artwork and navigation.
 */
export interface LibraryArtist {
  id: string
  catalogId: string | null
  name: string
  artworkUrl: string | undefined
}

interface LibraryArtistsPage {
  artists: LibraryArtist[]
  next: string | undefined
}

/**
 * Infinitely paginate through library artists.
 *
 * Uses `include=catalog` to resolve each library artist to its catalog
 * counterpart, which provides artwork and a catalog ID that can be used
 * with the `/v1/catalog/{storefront}/artists/{id}` endpoint.
 */
export function useLibraryArtists(enabled: boolean = true) {
  return useInfiniteQuery<LibraryArtistsPage>({
    queryKey: queryKeys.library.artists(),
    queryFn: async ({ pageParam }) => {
      let data: MusicKit.APIResponseData
      if (pageParam) {
        // The `next` URL from the API doesn't carry `include=catalog`,
        // so we append it to ensure every page resolves artwork.
        const sep = (pageParam as string).includes('?') ? '&' : '?'
        data = await musicAPI(`${pageParam as string}${sep}include=catalog`)
      } else {
        data = await musicAPI('/v1/me/library/artists', {
          limit: 25,
          include: 'catalog',
        })
      }

      const artists: LibraryArtist[] = (data.data ?? []).map(
        (item: MusicKit.Resource) => {
          const catalogEntry = item.relationships?.catalog?.data?.[0]
          return {
            id: item.id,
            catalogId: catalogEntry?.id ?? null,
            name: item.attributes?.name ?? 'Unknown Artist',
            artworkUrl: catalogEntry?.attributes?.artwork?.url,
          }
        },
      )

      return { artists, next: data.next }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next,
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
