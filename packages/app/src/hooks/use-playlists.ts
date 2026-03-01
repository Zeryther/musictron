import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { musicAPI } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'
import type { PlaylistItem } from '@/stores/library-store'

interface PlaylistTracksPage {
  tracks: MusicKit.Resource[]
  next: string | undefined
}

/**
 * Fetch playlist metadata (name, artwork, curator, etc.).
 * The first page of tracks is included via the `include=tracks` param,
 * but full track pagination is handled by `usePlaylistTracks`.
 */
export function usePlaylistDetail(playlistId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.playlists.detail(playlistId ?? ''),
    queryFn: async () => {
      const isLibrary = playlistId!.startsWith('p.')
      const path = isLibrary
        ? `/v1/me/library/playlists/${playlistId}`
        : `/v1/catalog/{{storefrontId}}/playlists/${playlistId}`

      const data = await musicAPI(path, {
        include: 'tracks',
        'include[library-playlists]': 'tracks',
      })
      const playlist = data.data?.[0] ?? null
      return { playlist }
    },
    enabled: !!playlistId,
  })
}

/**
 * Infinitely paginate through all tracks in a playlist.
 *
 * The first page comes from the playlist's `relationships.tracks` (included
 * in the detail response). Subsequent pages follow the `next` cursor URL
 * returned by the Apple Music API until all tracks are loaded.
 */
export function usePlaylistTracks(playlistId: string | undefined) {
  return useInfiniteQuery<PlaylistTracksPage>({
    queryKey: queryKeys.playlists.tracks(playlistId ?? ''),
    queryFn: async ({ pageParam }) => {
      if (pageParam) {
        // Follow the `next` cursor URL for subsequent pages
        const data = await musicAPI(pageParam as string)
        return {
          tracks: (data.data ?? []) as MusicKit.Resource[],
          next: data.next,
        }
      }

      // First page: fetch the playlist with included tracks
      const isLibrary = playlistId!.startsWith('p.')
      const path = isLibrary
        ? `/v1/me/library/playlists/${playlistId}`
        : `/v1/catalog/{{storefrontId}}/playlists/${playlistId}`

      const data = await musicAPI(path, {
        include: 'tracks',
        'include[library-playlists]': 'tracks',
      })
      const playlist = data.data?.[0] ?? null
      const tracksRel = playlist?.relationships?.tracks
      return {
        tracks: (tracksRel?.data ?? []) as MusicKit.Resource[],
        next: tracksRel?.next,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: !!playlistId,
  })
}

/**
 * Fetch all library playlists (for sidebar + library page).
 */
export function useLibraryPlaylists(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.library.playlists(),
    queryFn: async (): Promise<PlaylistItem[]> => {
      const data = await musicAPI('/v1/me/library/playlists', { limit: 100 })
      return (data.data || []).map((item: MusicKit.Resource) => ({
        id: item.id,
        name: item.attributes?.name || 'Untitled',
        description: item.attributes?.description?.standard,
        artworkUrl: item.attributes?.artwork?.url,
        trackCount: item.attributes?.trackCount || 0,
        isEditable: item.attributes?.canEdit ?? true,
      }))
    },
    enabled,
  })
}

/**
 * Create a new library playlist.
 * Invalidates the library playlists cache on success.
 */
export function useCreatePlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      description,
      songIds,
    }: {
      name: string
      description?: string
      songIds?: string[]
    }) => {
      const body: Record<string, unknown> = {
        attributes: { name, description: description || '' },
      }
      if (songIds?.length) {
        body.relationships = {
          tracks: {
            data: songIds.map((id) => ({ id, type: 'songs' })),
          },
        }
      }
      const data = await musicAPI('/v1/me/library/playlists', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return data.data?.[0] ?? null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.library.playlists() })
    },
  })
}

/**
 * Delete a library playlist.
 * Invalidates the library playlists cache on success.
 */
export function useDeletePlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (playlistId: string) => {
      await musicAPI(`/v1/me/library/playlists/${playlistId}`, {
        method: 'DELETE',
      })
      return playlistId
    },
    onSuccess: (_data, playlistId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.playlists.detail(playlistId),
      })
      queryClient.removeQueries({
        queryKey: queryKeys.playlists.tracks(playlistId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.library.playlists() })
    },
  })
}

/**
 * Rename a library playlist.
 * Invalidates the library playlists cache on success.
 */
export function useRenamePlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      playlistId,
      name,
    }: {
      playlistId: string
      name: string
    }) => {
      await musicAPI(`/v1/me/library/playlists/${playlistId}`, {
        method: 'PATCH',
        body: JSON.stringify({ attributes: { name } }),
      })
      return { playlistId, name }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.playlists.detail(variables.playlistId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.playlists.tracks(variables.playlistId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.library.playlists() })
    },
  })
}

/**
 * Add songs to a library playlist.
 * Invalidates the specific playlist detail cache on success.
 */
export function useAddToPlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      playlistId,
      songIds,
    }: {
      playlistId: string
      songIds: string[]
    }) => {
      await musicAPI(`/v1/me/library/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
          data: songIds.map((id) => ({ id, type: 'songs' })),
        }),
      })
      return playlistId
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.playlists.detail(variables.playlistId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.playlists.tracks(variables.playlistId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.library.playlists() })
    },
  })
}
