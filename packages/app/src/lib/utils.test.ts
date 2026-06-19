import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cn,
  extractAlbumIdFromUrl,
  formatArtworkUrl,
  formatDuration,
  formatPlayCount,
  formatTime,
  getGreeting,
} from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('resolves conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})

describe('formatTime', () => {
  it('formats seconds as M:SS', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(3661)).toBe('61:01')
  })

  it('returns 0:00 for NaN or negative input', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(-5)).toBe('0:00')
  })
})

describe('formatDuration', () => {
  it('formats milliseconds as M:SS', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(1_000)).toBe('0:01')
    expect(formatDuration(200_000)).toBe('3:20')
    expect(formatDuration(61_000)).toBe('1:01')
  })
})

describe('formatArtworkUrl', () => {
  it('returns empty string for undefined url', () => {
    expect(formatArtworkUrl(undefined)).toBe('')
  })

  it('substitutes {w} and {h} placeholders', () => {
    expect(formatArtworkUrl('https://x/{w}x{h}.jpg', 300)).toBe(
      'https://x/300x300.jpg',
    )
  })

  it('defaults size to 300', () => {
    expect(formatArtworkUrl('https://x/{w}x{h}.jpg')).toBe(
      'https://x/300x300.jpg',
    )
  })
})

describe('formatPlayCount', () => {
  it('formats small numbers verbatim', () => {
    expect(formatPlayCount(0)).toBe('0')
    expect(formatPlayCount(999)).toBe('999')
  })

  it('formats thousands with K', () => {
    expect(formatPlayCount(1_000)).toBe('1.0K')
    expect(formatPlayCount(1_500)).toBe('1.5K')
  })

  it('formats millions with M', () => {
    expect(formatPlayCount(1_000_000)).toBe('1.0M')
    expect(formatPlayCount(2_500_000)).toBe('2.5M')
  })
})

describe('getGreeting', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [8, 'Good Morning'],
    [13, 'Good Afternoon'],
    [20, 'Good Evening'],
  ])('returns the right greeting at hour %i', (hour, expected) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2020, 0, 1, hour, 0, 0))
    expect(getGreeting()).toBe(expected)
  })
})

describe('extractAlbumIdFromUrl', () => {
  it('returns undefined for undefined input', () => {
    expect(extractAlbumIdFromUrl(undefined)).toBeUndefined()
  })

  it('extracts the album id from an Apple Music URL', () => {
    expect(
      extractAlbumIdFromUrl(
        'https://music.apple.com/us/album/random-access-memories/617154241?i=617154248',
      ),
    ).toBe('617154241')
  })

  it('returns undefined when no album id is present', () => {
    expect(
      extractAlbumIdFromUrl('https://music.apple.com/us/artist/foo'),
    ).toBeUndefined()
  })
})
