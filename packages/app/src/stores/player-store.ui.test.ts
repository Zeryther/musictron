import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initializePlayerEvents, usePlayerStore } from '@/stores/player-store'
import { useVolumeNormalizationStore } from '@/stores/volume-normalization-store'
import { clearMusicKit, stubMusicKit } from '@/test/musickit'
import { autoResetStores } from '@/test/store'

autoResetStores(usePlayerStore, useVolumeNormalizationStore)

const ids = (count: number) =>
  Array.from({ length: count }, (_, i) => `i.song${i}`)

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

/**
 * Stub MusicKit so `setQueue` builds a queue from the requested songs, minus
 * any `unplayable` ids (MusicKit drops those), positioned at `startWith`, and
 * `playLater` appends to it. Like MusicKit, a song repeated within one request
 * only keeps its last occurrence.
 */
function stubQueue(unplayable: string[] = []) {
  const stub = stubMusicKit()
  const resolve = (songs: string[] = []) =>
    songs.filter(
      (id, index) =>
        !unplayable.includes(id) && songs.lastIndexOf(id) === index,
    )
  vi.mocked(stub.instance.setQueue).mockImplementation(async (options) => {
    stub.instance.queue = queueOf(
      resolve(options.songs),
      options.startWith ?? 0,
    )
    return stub.instance.queue
  })
  vi.mocked(stub.instance.playLater).mockImplementation(async (options) => {
    const { items, position } = stub.instance.queue
    stub.instance.queue = queueOf(
      [...items.map((item) => item.id), ...resolve(options.songs)],
      position,
    )
  })
  return stub
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  usePlayerStore.getState()._stopTimeUpdater()
  vi.clearAllTimers()
  vi.useRealTimers()
  clearMusicKit()
})

describe('usePlayerStore.playSongs', () => {
  it('queues short lists in a single request', async () => {
    const { instance } = stubQueue()
    const songIds = ids(10)

    await usePlayerStore.getState().playSongs(songIds, 3)

    expect(instance.setQueue).toHaveBeenCalledWith({
      songs: songIds,
      startWith: 3,
      startPlaying: false,
    })
    expect(instance.play).toHaveBeenCalled()
    expect(instance.changeToMediaAtIndex).not.toHaveBeenCalled()
    expect(instance.playLater).not.toHaveBeenCalled()
  })

  it('splits long lists into batches starting at the selected song', async () => {
    const { instance } = stubQueue()
    const songIds = ids(100)

    await usePlayerStore.getState().playSongs(songIds, 10)

    expect(instance.setQueue).toHaveBeenCalledWith({
      songs: songIds.slice(10, 35),
      startWith: 0,
      startPlaying: false,
    })
    expect(instance.play).toHaveBeenCalled()
    expect(vi.mocked(instance.playLater).mock.calls).toEqual([
      [{ songs: songIds.slice(35, 60) }],
      [{ songs: songIds.slice(60, 85) }],
      [{ songs: songIds.slice(85, 100) }],
    ])
  })

  it('stops appending batches once a newer queue is set', async () => {
    const { instance } = stubQueue()
    vi.mocked(instance.playLater).mockImplementationOnce(async () => {
      await usePlayerStore.getState().playTrack('other-song')
    })

    await usePlayerStore.getState().playSongs(ids(100))

    expect(instance.playLater).toHaveBeenCalledTimes(1)
  })

  it('surfaces a playback error when the first batch fails', async () => {
    const { instance } = stubQueue()
    vi.mocked(instance.setQueue).mockRejectedValueOnce(
      new Error('Unable to read body as JSON'),
    )

    await usePlayerStore.getState().playSongs(ids(100))

    expect(usePlayerStore.getState().playbackError?.title).toBe(
      'Playback failed',
    )
    expect(instance.playLater).not.toHaveBeenCalled()
  })

  it('plays the clicked song even if MusicKit dropped an earlier one', async () => {
    // "x" is unplayable, so MusicKit builds the queue without it and the
    // requested start position now points one song too far.
    const { instance } = stubQueue(['x'])

    await usePlayerStore.getState().playSongs(['x', 'a', 'b'], 1)

    expect(instance.changeToMediaAtIndex).toHaveBeenCalledWith(0)
    expect(instance.play).not.toHaveBeenCalled()
  })

  it('reports an error instead of playing a different song', async () => {
    const { instance } = stubQueue(['x'])

    await usePlayerStore.getState().playSongs(['x', 'a', 'b'], 0)

    expect(instance.play).not.toHaveBeenCalled()
    expect(instance.changeToMediaAtIndex).not.toHaveBeenCalled()
    expect(usePlayerStore.getState().playbackError?.title).toBe(
      'Song unavailable',
    )
  })

  it('does not append later batches when the clicked song is unavailable', async () => {
    const songIds = ids(100)
    const { instance } = stubQueue([songIds[10]])

    await usePlayerStore.getState().playSongs(songIds, 10)

    expect(instance.play).not.toHaveBeenCalled()
    expect(instance.playLater).not.toHaveBeenCalled()
    expect(usePlayerStore.getState().playbackError?.title).toBe(
      'Song unavailable',
    )
  })
})

describe('volume normalization', () => {
  const normalization = () => useVolumeNormalizationStore.getState()

  it('scales the user volume by the current track gain', () => {
    const { instance } = stubMusicKit()
    normalization().setTrack({ songId: '1', status: 'ready', loudness: -10 })

    usePlayerStore.getState().setVolume(0.8)

    // Balanced targets -16 LUFS: -6 dB on a -10 LUFS track.
    expect(instance.volume).toBeCloseTo(0.8 * 0.501, 3)
    expect(usePlayerStore.getState().volume).toBe(0.8)
  })

  it('switches straight to the level of a new track', () => {
    const { instance } = stubMusicKit()
    normalization().setTrack({ songId: '1', status: 'ready', loudness: -16 })
    usePlayerStore.getState().setVolume(1)
    expect(instance.volume).toBe(1)

    normalization().setTrack({ songId: '2', status: 'ready', loudness: -10 })

    expect(instance.volume).toBeCloseTo(0.501, 3)
  })

  it('fades when a level changes mid-track', () => {
    const { instance } = stubMusicKit()
    normalization().setTrack({
      songId: '1',
      status: 'unavailable',
      loudness: null,
    })
    usePlayerStore.getState().setVolume(1)
    expect(instance.volume).toBeCloseTo(0.501, 3) // assumed -10 LUFS

    // The measurement finished: the track is quieter than assumed.
    normalization().setTrack({ songId: '1', status: 'ready', loudness: -16 })
    vi.advanceTimersByTime(200)
    expect(instance.volume).toBeGreaterThan(0.6)
    expect(instance.volume).toBeLessThan(0.95)

    vi.advanceTimersByTime(200)
    expect(instance.volume).toBe(1)
  })

  it('sets the level of the next track as soon as MusicKit announces it', () => {
    const { instance } = stubMusicKit()
    initializePlayerEvents()
    normalization().rememberLoudness('42', -10)
    usePlayerStore.getState().setVolume(1)

    const willChange = vi
      .mocked(instance.addEventListener)
      .mock.calls.find(([name]) => name === 'nowPlayingItemWillChange')?.[1]
    willChange?.({
      item: { id: '42', type: 'songs', attributes: {} } as MusicKit.MediaItem,
    })

    expect(normalization().track).toEqual({
      songId: '42',
      status: 'ready',
      loudness: -10,
    })
    expect(instance.volume).toBeCloseTo(0.501, 3)
  })

  it('restores the full volume when normalization is turned off', () => {
    const { instance } = stubMusicKit()
    normalization().setTrack({ songId: '1', status: 'ready', loudness: -10 })
    usePlayerStore.getState().setVolume(0.5)

    normalization().setEnabled(false)
    vi.advanceTimersByTime(400)

    expect(instance.volume).toBe(0.5)
  })
})

describe('usePlayerStore.playSongs with repeated songs', () => {
  it('never repeats a song within one queue request', async () => {
    const { instance } = stubQueue()

    await usePlayerStore.getState().playSongs(['a', 'b', 'a', 'c'], 0)

    expect(instance.setQueue).toHaveBeenCalledWith({
      songs: ['a', 'b'],
      startWith: 0,
      startPlaying: false,
    })
    expect(instance.play).toHaveBeenCalled()
    expect(vi.mocked(instance.playLater).mock.calls).toEqual([
      [{ songs: ['a', 'c'] }],
    ])
    expect(instance.queue.items.map((item) => item.id)).toEqual([
      'a',
      'b',
      'a',
      'c',
    ])
  })

  it('plays the clicked occurrence of a repeated song', async () => {
    const { instance } = stubQueue()

    await usePlayerStore.getState().playSongs(['a', 'b', 'a', 'c'], 2)

    // The batch holding the clicked song is queued before playback starts.
    expect(instance.playLater).toHaveBeenCalledWith({ songs: ['a', 'c'] })
    expect(instance.changeToMediaAtIndex).toHaveBeenCalledWith(2)
    expect(
      vi.mocked(instance.playLater).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(instance.changeToMediaAtIndex).mock.invocationCallOrder[0],
    )
  })

  it('records which list the queue was started from', async () => {
    stubQueue()
    const songIds = ids(100)

    await usePlayerStore.getState().playSongs(songIds, 10, 'playlist:p.1')
    expect(usePlayerStore.getState().playContext).toEqual({
      key: 'playlist:p.1',
      offset: 10,
    })

    await usePlayerStore.getState().playSongs(songIds, 10)
    expect(usePlayerStore.getState().playContext).toBeNull()
  })
})
