import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayerStore } from '@/stores/player-store'
import { clearMusicKit, stubMusicKit } from '@/test/musickit'
import { autoResetStores } from '@/test/store'

autoResetStores(usePlayerStore)

function queueOf(ids: string[], position = 0): MusicKit.Queue {
  return {
    items: ids.map(
      (id) => ({ id, type: 'songs', attributes: {} }) as MusicKit.MediaItem,
    ),
    position,
    length: ids.length,
    isEmpty: ids.length === 0,
    nextPlayableItem: null,
    previousPlayableItem: null,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  usePlayerStore.getState()._stopTimeUpdater()
  vi.useRealTimers()
  clearMusicKit()
})

describe('usePlayerStore.playSongs', () => {
  it('plays the clicked song even if MusicKit dropped an earlier one', async () => {
    // "x" is unplayable, so MusicKit builds the queue without it.
    const queue = queueOf(['a', 'b'])
    const { instance } = stubMusicKit({
      queue,
      setQueue: vi.fn(async () => queue),
    })

    await usePlayerStore.getState().playSongs(['x', 'a', 'b'], 1)

    expect(instance.setQueue).toHaveBeenCalledWith(
      expect.objectContaining({ startPlaying: false }),
    )
    expect(instance.changeToMediaAtIndex).toHaveBeenCalledWith(0)
    expect(instance.play).not.toHaveBeenCalled()
  })

  it('just plays when MusicKit is already at the clicked song', async () => {
    const queue = queueOf(['a', 'b', 'c'], 1)
    const { instance } = stubMusicKit({
      queue,
      setQueue: vi.fn(async () => queue),
    })

    await usePlayerStore.getState().playSongs(['a', 'b', 'c'], 1)

    expect(instance.play).toHaveBeenCalled()
    expect(instance.changeToMediaAtIndex).not.toHaveBeenCalled()
  })

  it('reports an error instead of playing a different song', async () => {
    const queue = queueOf(['a', 'b'])
    const { instance } = stubMusicKit({
      queue,
      setQueue: vi.fn(async () => queue),
    })

    await usePlayerStore.getState().playSongs(['x', 'a', 'b'], 0)

    expect(instance.play).not.toHaveBeenCalled()
    expect(instance.changeToMediaAtIndex).not.toHaveBeenCalled()
    expect(usePlayerStore.getState().playbackError?.title).toBe(
      'Song unavailable',
    )
  })
})
