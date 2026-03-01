import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '@/components/layout/main-layout'
import { HomePage } from '@/pages/home'
import { BrowsePage } from '@/pages/browse'
import { SearchPage } from '@/pages/search'
import { RadioPage } from '@/pages/radio'
import { LibraryPage } from '@/pages/library'
import { AlbumDetailPage } from '@/pages/album-detail'
import { PlaylistDetailPage } from '@/pages/playlist-detail'
import { ArtistDetailPage } from '@/pages/artist-detail'
import { SettingsPage } from '@/pages/settings'
import { useAuthStore } from '@/stores/auth-store'
import { usePlayerStore } from '@/stores/player-store'
import { useLibraryStore } from '@/stores/library-store'
import { initializePlayerEvents } from '@/stores/player-store'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { getPlatformAdapter } from '@/lib/platform'

export default function App() {
  const { initialize, isAuthorized, developerToken } = useAuthStore()
  const { fetchPlaylists } = useLibraryStore()

  // Set up keyboard shortcuts
  useKeyboardShortcuts()

  // Initialize MusicKit on load.
  // Runs unconditionally — initialize() handles the no-token case by
  // attempting to fetch one from the server, then bailing if unavailable.
  useEffect(() => {
    initialize().then(() => {
      initializePlayerEvents()
    })
  }, [developerToken, initialize])

  // Fetch playlists when authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchPlaylists()
    }
  }, [isAuthorized, fetchPlaylists])

  // Listen for media keys from the platform adapter (Electron only)
  useEffect(() => {
    const platform = getPlatformAdapter()
    if (platform.onMediaKey) {
      const cleanup = platform.onMediaKey((key: string) => {
        const store = usePlayerStore.getState()
        switch (key) {
          case 'play-pause':
            store.togglePlayPause()
            break
          case 'next':
            store.skipNext()
            break
          case 'previous':
            store.skipPrevious()
            break
        }
      })
      return cleanup
    }
  }, [])

  // Update window/document title with now playing
  useEffect(() => {
    const platform = getPlatformAdapter()
    const unsub = usePlayerStore.subscribe((state) => {
      if (state.nowPlaying) {
        platform.setTitle(
          `${state.nowPlaying.name} - ${state.nowPlaying.artistName}`,
        )
      }
    })
    return unsub
  }, [])

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/radio" element={<RadioPage />} />
        <Route path="/library/:section" element={<LibraryPage />} />
        <Route path="/album/:id" element={<AlbumDetailPage />} />
        <Route path="/playlist/:id" element={<PlaylistDetailPage />} />
        <Route path="/artist/:id" element={<ArtistDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
