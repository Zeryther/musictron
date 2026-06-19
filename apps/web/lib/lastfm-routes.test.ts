import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as LastfmModule from '@web/lib/lastfm'
import { LastfmApiError, isLastfmConfigured, lastfmPost } from '@web/lib/lastfm'
import { apiJson, jsonPost } from '@web/lib/__test-helpers__/elysia'

// Mock the Last.fm client but keep the real LastfmApiError class so the routes'
// `instanceof LastfmApiError` checks still work.
vi.mock('@web/lib/lastfm', async (importOriginal) => {
  const actual = await importOriginal<typeof LastfmModule>()
  return {
    ...actual,
    isLastfmConfigured: vi.fn(() => true),
    lastfmGet: vi.fn(),
    lastfmPost: vi.fn(),
    getAuthToken: vi.fn(async () => 'tok'),
    getSession: vi.fn(async () => ({ name: 'me', key: 'sk' })),
    buildAuthUrl: vi.fn(() => 'https://www.last.fm/api/auth/?token=tok'),
  }
})

beforeEach(() => {
  vi.mocked(isLastfmConfigured).mockReturnValue(true)
})

describe('GET /api/lastfm/status', () => {
  it('reports configured', async () => {
    const { status, body } = await apiJson<{ configured: boolean }>(
      '/api/lastfm/status',
    )
    expect(status).toBe(200)
    expect(body.configured).toBe(true)
  })
})

describe('GET /api/lastfm/artist', () => {
  it('returns 503 when Last.fm is not configured', async () => {
    vi.mocked(isLastfmConfigured).mockReturnValueOnce(false)
    const { status } = await apiJson('/api/lastfm/artist?artist=Air')
    expect(status).toBe(503)
  })
})

describe('GET /api/lastfm/auth/start', () => {
  it('returns the auth url and token', async () => {
    const { status, body } = await apiJson<{ url: string; token: string }>(
      '/api/lastfm/auth/start',
    )
    expect(status).toBe(200)
    expect(body.token).toBe('tok')
    expect(body.url).toContain('last.fm/api/auth')
  })
})

describe('POST /api/lastfm/auth/session', () => {
  it('returns 400 when the token is empty', async () => {
    const { status } = await apiJson(
      '/api/lastfm/auth/session',
      jsonPost({ token: '' }),
    )
    expect(status).toBe(400)
  })
})

describe('POST /api/lastfm/scrobble', () => {
  it.each([11, 16, 29])('marks code %i as retryable', async (code) => {
    vi.mocked(lastfmPost).mockRejectedValueOnce(
      new LastfmApiError('transient', { code }),
    )

    const { status, body } = await apiJson<{ retryable: boolean }>(
      '/api/lastfm/scrobble',
      jsonPost({ sk: 'k' }),
    )

    expect(status).toBe(500)
    expect(body.retryable).toBe(true)
  })

  it('marks other error codes as non-retryable', async () => {
    vi.mocked(lastfmPost).mockRejectedValueOnce(
      new LastfmApiError('hard failure', { code: 5 }),
    )

    const { body } = await apiJson<{ retryable: boolean }>(
      '/api/lastfm/scrobble',
      jsonPost({ sk: 'k' }),
    )
    expect(body.retryable).toBe(false)
  })

  it('caps a scrobble batch at 50 items', async () => {
    vi.mocked(lastfmPost).mockResolvedValueOnce({})

    const scrobbles = Array.from({ length: 60 }, (_, i) => ({
      artist: `artist ${i}`,
      track: `track ${i}`,
      timestamp: 1_000 + i,
    }))

    await apiJson('/api/lastfm/scrobble', jsonPost({ sk: 'k', scrobbles }))

    const params = vi.mocked(lastfmPost).mock.calls[0][0]
    expect(params['artist[49]']).toBe('artist 49')
    expect(params['artist[50]']).toBeUndefined()
  })
})

describe('POST /api/lastfm/now-playing', () => {
  it('returns 202 (non-blocking) when Last.fm fails', async () => {
    vi.mocked(lastfmPost).mockRejectedValueOnce(
      new LastfmApiError('down', { code: 11 }),
    )

    const { status, body } = await apiJson<{
      ok: boolean
      nonBlocking: boolean
    }>(
      '/api/lastfm/now-playing',
      jsonPost({ artist: 'A', track: 'T', sk: 'k' }),
    )

    expect(status).toBe(202)
    expect(body.ok).toBe(false)
    expect(body.nonBlocking).toBe(true)
  })
})

describe('POST /api/lastfm/love + /unlove', () => {
  it('returns 401 when the session key is empty', async () => {
    const love = await apiJson(
      '/api/lastfm/love',
      jsonPost({ artist: 'A', track: 'T', sk: '' }),
    )
    expect(love.status).toBe(401)

    const unlove = await apiJson(
      '/api/lastfm/unlove',
      jsonPost({ artist: 'A', track: 'T', sk: '' }),
    )
    expect(unlove.status).toBe(401)
  })

  it('loves a track when configured', async () => {
    vi.mocked(lastfmPost).mockResolvedValueOnce({})
    const { status } = await apiJson(
      '/api/lastfm/love',
      jsonPost({ artist: 'A', track: 'T', sk: 'k' }),
    )
    expect(status).toBe(200)
    expect(vi.mocked(lastfmPost)).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'track.love', sk: 'k' }),
    )
  })
})
