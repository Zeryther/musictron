import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SongRow } from '@/components/ui/song-row'
import { usePlayerStore } from '@/stores/player-store'
import { renderWithProviders } from '@/test/render'
import { autoResetStores } from '@/test/store'

autoResetStores(usePlayerStore)

describe('SongRow', () => {
  it('renders the name, artist, and formatted duration', () => {
    renderWithProviders(
      <SongRow
        id="1"
        name="Digital Love"
        artistName="Daft Punk"
        duration={200_000}
      />,
    )

    expect(screen.getByText('Digital Love')).toBeInTheDocument()
    expect(screen.getByText('Daft Punk')).toBeInTheDocument()
    expect(screen.getByText('3:20')).toBeInTheDocument()
  })

  it('labels the play and more-actions controls for screen readers', () => {
    renderWithProviders(<SongRow id="1" name="Song" duration={1000} />)

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'More actions' }),
    ).toBeInTheDocument()
  })

  it('plays the track when the play button is clicked', async () => {
    const playTrack = vi.fn()
    usePlayerStore.setState({ playTrack })

    renderWithProviders(<SongRow id="track-42" name="Song" duration={1000} />)
    await userEvent.click(screen.getByRole('button', { name: 'Play' }))

    expect(playTrack).toHaveBeenCalledWith('track-42')
  })

  it('runs the dropdown queue actions', async () => {
    const playNext = vi.fn()
    const addToQueue = vi.fn()
    usePlayerStore.setState({ playNext, addToQueue })

    renderWithProviders(<SongRow id="track-7" name="Song" duration={1000} />)

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /play next/i }),
    )
    expect(playNext).toHaveBeenCalledWith('track-7')

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /add to queue/i }),
    )
    expect(addToQueue).toHaveBeenCalledWith('track-7')
  })
})
