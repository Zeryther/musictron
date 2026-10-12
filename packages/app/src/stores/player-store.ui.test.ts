import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayerStore } from '@/stores/player-store'
import { clearMusicKit, stubMusicKit } from '@/test/musickit'
import { autoResetStores } from '@/test/store'

autoResetStores(usePlayerStore)

const ids = (count: number) =>
  Array.from({ length: count }, (_, i) => `i.song${i}`)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  clearMusicKit()
})

describe('usePlayerStore.playSongs', () => {
  it('queues short lists in a single request', async () => {
    const { instance } = stubMusicKit()
    const songIds = ids(10)

    await usePlayerStore.getState().playSongs(songIds, 3)

    expect(instance.setQueue).toHaveBeenCalledWith({
      songs: songIds,
      startWith: 3,
      startPlaying: true,
    })
    expect(instance.playLater).not.toHaveBeenCalled()
  })

  it('splits long lists into batches starting at the selected song', async () => {
    const { instance } = stubMusicKit()
    const songIds = ids(100)

    await usePlayerStore.getState().playSongs(songIds, 10)

    expect(instance.setQueue).toHaveBeenCalledWith({
      songs: songIds.slice(10, 35),
      startWith: 0,
      startPlaying: true,
    })
    expect(vi.mocked(instance.playLater).mock.calls).toEqual([
      [{ songs: songIds.slice(35, 60) }],
      [{ songs: songIds.slice(60, 85) }],
      [{ songs: songIds.slice(85, 100) }],
    ])
  })

  it('stops appending batches once a newer queue is set', async () => {
    const { instance } = stubMusicKit()
    vi.mocked(instance.playLater).mockImplementationOnce(async () => {
      await usePlayerStore.getState().playTrack('other-song')
    })

    await usePlayerStore.getState().playSongs(ids(100))

    expect(instance.playLater).toHaveBeenCalledTimes(1)
  })

  it('surfaces a playback error when the first batch fails', async () => {
    const { instance } = stubMusicKit()
    vi.mocked(instance.setQueue).mockRejectedValueOnce(
      new Error('Unable to read body as JSON'),
    )

    await usePlayerStore.getState().playSongs(ids(100))

    expect(usePlayerStore.getState().playbackError?.title).toBe(
      'Playback failed',
    )
    expect(instance.playLater).not.toHaveBeenCalled()
  })
})
