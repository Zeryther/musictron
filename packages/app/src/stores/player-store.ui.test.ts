import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSignInHandler, usePlayerStore } from '@/stores/player-store'
import { clearMusicKit, stubMusicKit } from '@/test/musickit'
import { autoResetStores } from '@/test/store'

autoResetStores(usePlayerStore)

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
  const stub = stubMusicKit({ isAuthorized: true })
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
  setSignInHandler(null)
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

/** Sign-in handler that signs `instance` in, or does nothing if cancelled. */
function stubSignIn(instance: MusicKit.MusicKitInstance, succeeds = true) {
  const signIn = vi.fn(async () => {
    if (succeeds) instance.isAuthorized = true
  })
  setSignInHandler(signIn)
  return signIn
}

describe('usePlayerStore library playback and sign-in', () => {
  it('signs in first, then plays, when a library song is clicked signed out', async () => {
    const { instance } = stubQueue()
    instance.isAuthorized = false
    const signIn = stubSignIn(instance)

    await usePlayerStore.getState().playSongs(ids(3), 1)
    await vi.waitFor(() => expect(instance.setQueue).toHaveBeenCalled())

    expect(signIn).toHaveBeenCalledTimes(1)
    expect(signIn.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(instance.setQueue).mock.invocationCallOrder[0],
    )
    expect(usePlayerStore.getState().playbackError).toBeNull()
  })

  it('asks to sign in if the sign-in is cancelled', async () => {
    const { instance } = stubQueue()
    instance.isAuthorized = false
    stubSignIn(instance, false)

    await usePlayerStore.getState().playSongs(ids(3), 1)
    await vi.waitFor(() =>
      expect(usePlayerStore.getState().playbackError?.title).toBe(
        'Sign in required',
      ),
    )

    expect(instance.setQueue).not.toHaveBeenCalled()
    expect(usePlayerStore.getState().playbackError?.canSignIn).toBe(true)
  })

  it('still queues catalog songs while signed out', async () => {
    const { instance } = stubMusicKit({ isAuthorized: false })
    const signIn = stubSignIn(instance)

    await usePlayerStore.getState().playTrack('1440857781')

    expect(signIn).not.toHaveBeenCalled()
    expect(instance.setQueue).toHaveBeenCalled()
    expect(usePlayerStore.getState().playbackError).toBeNull()
  })

  it('clears a rejected session and retries after signing in again', async () => {
    const { instance } = stubQueue()
    // What MusicKit throws when a library request comes back 403.
    vi.mocked(instance.setQueue).mockRejectedValueOnce(
      new TypeError("undefined is not an object (evaluating 'e.id')"),
    )
    vi.mocked(instance.api.music).mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { data: { status: 403 } }),
    )
    vi.mocked(instance.unauthorize).mockImplementation(async () => {
      instance.isAuthorized = false
    })

    await usePlayerStore.getState().playSongs(ids(3), 1)

    expect(instance.api.music).toHaveBeenCalledWith('/v1/me/storefront')
    expect(instance.unauthorize).toHaveBeenCalled()
    expect(usePlayerStore.getState().playbackError).toMatchObject({
      title: 'Apple Music session expired',
      canSignIn: true,
    })

    const signIn = stubSignIn(instance)
    await usePlayerStore.getState().signInAndRetry()

    expect(signIn).toHaveBeenCalledTimes(1)
    expect(instance.setQueue).toHaveBeenCalledTimes(2)
    expect(instance.play).toHaveBeenCalled()
    expect(usePlayerStore.getState().playbackError).toBeNull()
  })

  it('does not sign out over a rejected developer token', async () => {
    const { instance } = stubQueue()
    vi.mocked(instance.setQueue).mockRejectedValueOnce(new Error('boom'))
    vi.mocked(instance.api.music).mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), { data: { status: 401 } }),
    )

    await usePlayerStore.getState().playSongs(ids(3), 1)

    expect(instance.unauthorize).not.toHaveBeenCalled()
    expect(usePlayerStore.getState().playbackError).toEqual({
      title: 'Playback failed',
      message: 'boom',
    })
  })

  it('keeps the original error when the session is still valid', async () => {
    const { instance } = stubQueue()
    vi.mocked(instance.setQueue).mockRejectedValueOnce(new Error('boom'))

    await usePlayerStore.getState().playSongs(ids(3), 1)

    expect(instance.unauthorize).not.toHaveBeenCalled()
    expect(usePlayerStore.getState().playbackError).toEqual({
      title: 'Playback failed',
      message: 'boom',
    })
  })

  it('signs in once and plays the latest request when clicked again meanwhile', async () => {
    const { instance } = stubQueue()
    instance.isAuthorized = false
    let finishSignIn = () => {}
    const signIn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSignIn = () => {
            instance.isAuthorized = true
            resolve()
          }
        }),
    )
    setSignInHandler(signIn)

    await usePlayerStore.getState().playSongs(['i.a', 'i.b'], 0)
    await usePlayerStore.getState().playSongs(['i.c', 'i.d'], 1)
    finishSignIn()
    await vi.waitFor(() => expect(instance.setQueue).toHaveBeenCalled())

    expect(signIn).toHaveBeenCalledTimes(1)
    expect(instance.setQueue).toHaveBeenCalledTimes(1)
    expect(instance.setQueue).toHaveBeenCalledWith(
      expect.objectContaining({ songs: ['i.c', 'i.d'] }),
    )
  })

  it('does not replay a request after something else was played', async () => {
    const { instance } = stubQueue()
    instance.isAuthorized = false
    let finishSignIn = () => {}
    setSignInHandler(
      () =>
        new Promise<void>((resolve) => {
          finishSignIn = () => {
            instance.isAuthorized = true
            resolve()
          }
        }),
    )

    await usePlayerStore.getState().playSongs(['i.a'], 0)
    await usePlayerStore.getState().playTrack('1440857781')
    finishSignIn()
    // Let the finished sign-in run whatever it would retry.
    await vi.advanceTimersByTimeAsync(0)

    expect(instance.setQueue).toHaveBeenCalledTimes(1)
    expect(instance.setQueue).toHaveBeenCalledWith(
      expect.objectContaining({ song: '1440857781' }),
    )
  })
})
