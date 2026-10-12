import { describe, expect, it } from 'vitest'
import { findQueueIndex, getPlaybackErrorMessage } from '@/stores/player-store'

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
