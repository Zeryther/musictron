import { create } from 'zustand'
import { musicAPI } from '@/lib/musickit'

export interface PlaylistItem {
  id: string
  name: string
  description?: string
  artworkUrl?: string
  trackCount: number
  isEditable: boolean
}

interface LibraryState {
  playlists: PlaylistItem[]
  isLoadingPlaylists: boolean

  fetchPlaylists: () => Promise<void>
  createPlaylist: (
    name: string,
    description?: string,
    songIds?: string[],
  ) => Promise<string | null>
  deletePlaylist: (playlistId: string) => Promise<void>
  addToPlaylist: (playlistId: string, songIds: string[]) => Promise<void>
  removeFromPlaylist: (playlistId: string, songIds: string[]) => Promise<void>
  renamePlaylist: (playlistId: string, name: string) => Promise<void>
}

export const useLibraryStore = create<LibraryState>()((set, _get) => ({
  playlists: [],
  isLoadingPlaylists: false,

  fetchPlaylists: async () => {
    try {
      set({ isLoadingPlaylists: true })
      const data = await musicAPI('/v1/me/library/playlists', {
        limit: 100,
      })

      const playlists: PlaylistItem[] = (data.data || []).map(
        (item: MusicKit.Resource) => ({
          id: item.id,
          name: item.attributes?.name || 'Untitled',
          description: item.attributes?.description?.standard,
          artworkUrl: item.attributes?.artwork?.url,
          trackCount: item.attributes?.trackCount || 0,
          isEditable: item.attributes?.canEdit ?? true,
        }),
      )

      set({ playlists, isLoadingPlaylists: false })
    } catch (error) {
      console.error('Failed to fetch playlists:', error)
      set({ isLoadingPlaylists: false })
    }
  },

  createPlaylist: async (
    name: string,
    description?: string,
    songIds?: string[],
  ) => {
    try {
      const body: Record<string, unknown> = {
        attributes: {
          name,
          description: description || '',
        },
      }

      if (songIds?.length) {
        body.relationships = {
          tracks: {
            data: songIds.map((id) => ({
              id,
              type: 'songs',
            })),
          },
        }
      }

      const data = await musicAPI('/v1/me/library/playlists', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const newPlaylist = data.data?.[0]
      if (newPlaylist) {
        set((s) => ({
          playlists: [
            {
              id: newPlaylist.id,
              name: newPlaylist.attributes?.name || name,
              description,
              artworkUrl: newPlaylist.attributes?.artwork?.url,
              trackCount: songIds?.length || 0,
              isEditable: true,
            },
            ...s.playlists,
          ],
        }))
        return newPlaylist.id
      }
      return null
    } catch (error) {
      console.error('Failed to create playlist:', error)
      return null
    }
  },

  deletePlaylist: async (playlistId: string) => {
    try {
      await musicAPI(`/v1/me/library/playlists/${playlistId}`, {
        method: 'DELETE',
      })
      set((s) => ({
        playlists: s.playlists.filter((p) => p.id !== playlistId),
      }))
    } catch (error) {
      console.error('Failed to delete playlist:', error)
    }
  },

  addToPlaylist: async (playlistId: string, songIds: string[]) => {
    try {
      await musicAPI(`/v1/me/library/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
          data: songIds.map((id) => ({ id, type: 'songs' })),
        }),
      })
    } catch (error) {
      console.error('Failed to add to playlist:', error)
    }
  },

  removeFromPlaylist: async (_playlistId: string, _songIds: string[]) => {
    try {
      // Apple Music API doesn't have a direct remove endpoint in JS SDK
      // This would require the REST API directly
      console.warn('Remove from playlist not yet implemented with MusicKit JS')
    } catch (error) {
      console.error('Failed to remove from playlist:', error)
    }
  },

  renamePlaylist: async (playlistId: string, name: string) => {
    try {
      await musicAPI(`/v1/me/library/playlists/${playlistId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          attributes: { name },
        }),
      })
      set((s) => ({
        playlists: s.playlists.map((p) =>
          p.id === playlistId ? { ...p, name } : p,
        ),
      }))
    } catch (error) {
      console.error('Failed to rename playlist:', error)
    }
  },
}))
