import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { musicAPI } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'
import type { PlaylistItem } from '@/stores/library-store'

/**
 * Fetch a single playlist by ID (catalog or library).
 * Library playlist IDs start with `p.`.
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
      const tracks: MusicKit.Resource[] =
        playlist?.relationships?.tracks?.data || []
      return { playlist, tracks }
    },
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
      queryClient.invalidateQueries({ queryKey: queryKeys.library.playlists() })
    },
  })
}
