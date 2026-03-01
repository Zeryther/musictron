// Library types shared across hooks.
// Playlist data fetching and mutations are handled by React Query hooks
// in hooks/use-playlists.ts and hooks/use-library.ts.

export interface PlaylistItem {
  id: string
  name: string
  description?: string
  artworkUrl?: string
  trackCount: number
  isEditable: boolean
}
