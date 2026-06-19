import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerBar } from '@/components/player/player-bar'
import { usePlayerStore } from '@/stores/player-store'
import { useLastfmStore } from '@/stores/lastfm-store'
import { renderWithProviders } from '@/test/render'
import { makeNowPlayingItem } from '@/test/factories'
import { autoResetStores } from '@/test/store'

autoResetStores(usePlayerStore, useLastfmStore)

describe('PlayerBar', () => {
  it('shows the empty state when nothing is playing', () => {
    renderWithProviders(<PlayerBar />)
    expect(screen.getByText('Not Playing')).toBeInTheDocument()
  })

  it('gives every icon-only transport control an accessible name', () => {
    renderWithProviders(<PlayerBar />)

    for (const name of [
      'Toggle shuffle',
      'Previous track',
      'Play',
      'Next track',
      'Toggle repeat',
      'Toggle queue',
      'Enter fullscreen',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('toggles play/pause when the play button is clicked', async () => {
    const togglePlayPause = vi.fn()
    usePlayerStore.setState({
      nowPlaying: makeNowPlayingItem({ name: 'Song', artistName: 'Artist' }),
      isPlaying: false,
      togglePlayPause,
    })

    renderWithProviders(<PlayerBar />)
    await userEvent.click(screen.getByRole('button', { name: 'Play' }))

    expect(togglePlayPause).toHaveBeenCalledTimes(1)
  })
})
