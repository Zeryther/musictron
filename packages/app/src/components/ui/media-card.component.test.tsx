import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MediaCard } from '@/components/ui/media-card'
import { usePlayerStore } from '@/stores/player-store'
import { renderWithProviders } from '@/test/render'
import { autoResetStores } from '@/test/store'

autoResetStores(usePlayerStore)

describe('MediaCard', () => {
  it('labels the overlay play button with the item name', () => {
    renderWithProviders(<MediaCard id="a1" type="album" name="Discovery" />)
    expect(
      screen.getByRole('button', { name: 'Play Discovery' }),
    ).toBeInTheDocument()
  })

  it('plays the album when the overlay play button is clicked', async () => {
    const playAlbum = vi.fn()
    usePlayerStore.setState({ playAlbum })

    renderWithProviders(<MediaCard id="a1" type="album" name="Discovery" />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Play Discovery' }),
    )

    expect(playAlbum).toHaveBeenCalledWith('a1')
  })

  it('plays the playlist when the overlay play button is clicked', async () => {
    const playPlaylist = vi.fn()
    usePlayerStore.setState({ playPlaylist })

    renderWithProviders(<MediaCard id="p1" type="playlist" name="Chill" />)
    await userEvent.click(screen.getByRole('button', { name: 'Play Chill' }))

    expect(playPlaylist).toHaveBeenCalledWith('p1')
  })

  it('activates the card onClick via the keyboard', () => {
    const onClick = vi.fn()
    renderWithProviders(
      <MediaCard id="a1" type="album" name="Discovery" onClick={onClick} />,
    )

    const card = screen
      .getAllByRole('button')
      .find((b) => b.getAttribute('aria-label') !== 'Play Discovery')
    expect(card).toBeDefined()

    fireEvent.keyDown(card as HTMLElement, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
