import { describe, expect, it } from 'vitest'
import { getPlaybackErrorMessage } from '@/stores/player-store'

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
