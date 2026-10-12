import { describe, expect, it } from 'vitest'
import {
  findPlayingTrackIndex,
  findQueueIndex,
  getPlaybackErrorMessage,
  type NowPlayingItem,
  type PlayContext,
} from '@/stores/player-store'

describe('getPlaybackErrorMessage', () => {
  it('maps "not configured" errors', () => {
    const { title } = getPlaybackErrorMessage(
      new Error('MusicKit is not configured'),
    )
    expect(title).toBe('Apple Music is not ready')
  })

  it('maps DRM / key-system errors', () => {
    expect(getPlaybackErrorMessage(new Error('keySystem failed')).title).toBe(
      'DRM playback failed',
    )
  })

  it('maps authorization errors', () => {
    expect(getPlaybackErrorMessage(new Error('403 Forbidden')).title).toBe(
      'Apple Music authorization failed',
    )
  })

  it('maps network errors', () => {
    expect(getPlaybackErrorMessage(new Error('network timeout')).title).toBe(
      'Playback network error',
    )
  })

  it('falls back to a generic message', () => {
    const result = getPlaybackErrorMessage(new Error('something odd'))
    expect(result.title).toBe('Playback failed')
    expect(result.message).toBe('something odd')
  })

  it('handles non-Error inputs', () => {
    expect(getPlaybackErrorMessage({ weird: true }).title).toBe(
      'Playback failed',
    )
  })
})

function mediaItem(
  id: string,
  playParams?: { id: string; catalogId?: string },
): MusicKit.MediaItem {
  return {
    id,
    type: 'songs',
    attributes: {
      name: id,
      artistName: '',
      albumName: '',
      artwork: { url: '', width: 0, height: 0 },
      durationInMillis: 0,
      playParams: playParams && { kind: 'song', ...playParams },
    },
  }
}

describe('findQueueIndex', () => {
  it('finds the song when the queue matches the list', () => {
    const items = [mediaItem('a'), mediaItem('b'), mediaItem('c')]
    expect(findQueueIndex(items, 'a', 0)).toBe(0)
    expect(findQueueIndex(items, 'c', 2)).toBe(2)
  })

  it('accounts for unplayable songs MusicKit dropped from the queue', () => {
    // List was [x, a, b]; MusicKit dropped the unplayable "x".
    const items = [mediaItem('a'), mediaItem('b')]
    expect(findQueueIndex(items, 'a', 1)).toBe(0)
    expect(findQueueIndex(items, 'b', 2)).toBe(1)
  })

  it('returns -1 when the song was dropped', () => {
    expect(findQueueIndex([mediaItem('a')], 'x', 0)).toBe(-1)
    expect(findQueueIndex([mediaItem('a')], undefined, 0)).toBe(-1)
  })

  it('matches by play params ids', () => {
    const items = [
      mediaItem('q1', { id: 'i.lib1', catalogId: '111' }),
      mediaItem('q2', { id: 'i.lib2', catalogId: '222' }),
    ]
    expect(findQueueIndex(items, 'i.lib2', 1)).toBe(1)
    expect(findQueueIndex(items, '222', 1)).toBe(1)
  })

  it('picks the clicked occurrence of a duplicated song', () => {
    const items = [mediaItem('a'), mediaItem('b'), mediaItem('a')]
    expect(findQueueIndex(items, 'a', 0)).toBe(0)
    expect(findQueueIndex(items, 'a', 2)).toBe(2)
    // One earlier song dropped: clicked index 3 is now at 2.
    expect(findQueueIndex(items, 'a', 3)).toBe(2)
  })
})

describe('findPlayingTrackIndex', () => {
  const item = (id: string) => ({ id }) as NowPlayingItem

  function state(
    queueIds: string[],
    queuePosition: number,
    playContext: PlayContext | null,
  ) {
    return {
      nowPlaying: item(queueIds[queuePosition]),
      queue: queueIds.map(item),
      queuePosition,
      playContext,
      shuffleMode: 0,
    }
  }

  const tracks = ['a', 'b', 'a', 'c']
  const context = { key: 'playlist:1', offset: 0 }

  it('highlights only the occurrence the queue is on', () => {
    expect(
      findPlayingTrackIndex(tracks, 'playlist:1', state(tracks, 0, context)),
    ).toBe(0)
    expect(
      findPlayingTrackIndex(tracks, 'playlist:1', state(tracks, 2, context)),
    ).toBe(2)
  })

  it('accounts for the queue starting partway through the list', () => {
    const queued = state(['a', 'c'], 0, { key: 'playlist:1', offset: 2 })
    expect(findPlayingTrackIndex(tracks, 'playlist:1', queued)).toBe(2)
  })

  it('accounts for songs MusicKit dropped from the queue', () => {
    // "b" was unplayable, so the queue is [a, a, c].
    const queued = state(['a', 'a', 'c'], 1, context)
    expect(findPlayingTrackIndex(tracks, 'playlist:1', queued)).toBe(2)
  })

  it('falls back to the first occurrence for other lists', () => {
    expect(
      findPlayingTrackIndex(tracks, 'playlist:2', state(tracks, 2, context)),
    ).toBe(0)
    expect(
      findPlayingTrackIndex(tracks, 'playlist:1', state(tracks, 2, null)),
    ).toBe(0)
  })

  it('returns -1 when nothing from the list is playing', () => {
    expect(
      findPlayingTrackIndex(tracks, 'playlist:1', state(['x'], 0, null)),
    ).toBe(-1)
  })
})
