import { describe, expect, it } from 'vitest'
import { shouldScrobble } from '@/lib/lastfm-scrobbler'

describe('shouldScrobble', () => {
  it('rejects tracks 30 seconds or shorter', () => {
    expect(shouldScrobble(30, 30)).toBe(false)
    expect(shouldScrobble(20, 20)).toBe(false)
  })

  it('requires 50% of the duration for short tracks', () => {
    // duration 200s → threshold = min(100, 240) = 100s
    expect(shouldScrobble(200, 99)).toBe(false)
    expect(shouldScrobble(200, 100)).toBe(true)
  })

  it('caps the threshold at 4 minutes for long tracks', () => {
    // duration 600s → threshold = min(300, 240) = 240s
    expect(shouldScrobble(600, 239)).toBe(false)
    expect(shouldScrobble(600, 240)).toBe(true)
  })

  it('accepts a track just over the minimum duration', () => {
    // duration 31s → threshold = min(15.5, 240) = 15.5s
    expect(shouldScrobble(31, 16)).toBe(true)
    expect(shouldScrobble(31, 15)).toBe(false)
  })
})
