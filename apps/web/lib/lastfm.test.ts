import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LastfmApiError,
  buildAuthUrl,
  getAuthToken,
  getSession,
  isLastfmConfigured,
  lastfmGet,
  lastfmPost,
} from '@web/lib/lastfm'

const API_URL = 'https://ws.audioscrobbler.com/2.0/'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubEnv('LASTFM_API_KEY', 'test-key')
  vi.stubEnv('LASTFM_SECRET', 'test-secret')
})

describe('isLastfmConfigured', () => {
  it('is true when both credentials are present', () => {
    expect(isLastfmConfigured()).toBe(true)
  })

  it('is false when the secret is missing', () => {
    vi.stubEnv('LASTFM_SECRET', '')
    expect(isLastfmConfigured()).toBe(false)
  })
})

describe('buildAuthUrl', () => {
  it('includes the api key and token', () => {
    const url = buildAuthUrl('tok123')
    expect(url).toContain('https://www.last.fm/api/auth/')
    expect(url).toContain('api_key=test-key')
    expect(url).toContain('token=tok123')
  })
})

describe('lastfmGet', () => {
  it('adds api_key and format and returns parsed data', async () => {
    const fetchMock = vi.fn(async (_input: unknown) =>
      jsonResponse({ artist: { name: 'Air' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const data = await lastfmGet<{ artist: { name: string } }>({
      method: 'artist.getInfo',
      artist: 'Air',
    })

    expect(data.artist.name).toBe('Air')
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('api_key=test-key')
    expect(url).toContain('format=json')
    expect(url).toContain('method=artist.getInfo')
  })

  it('throws LastfmApiError with the code for an in-body error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 6, message: 'Not found' })),
    )

    const err = await lastfmGet({ method: 'artist.getInfo' }).catch((e) => e)
    expect(err).toBeInstanceOf(LastfmApiError)
    expect((err as LastfmApiError).code).toBe(6)
  })

  it('throws LastfmApiError with the status for a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    )

    const err = await lastfmGet({ method: 'artist.getInfo' }).catch((e) => e)
    expect(err).toBeInstanceOf(LastfmApiError)
    expect((err as LastfmApiError).status).toBe(500)
  })
})

describe('lastfmPost', () => {
  it('signs the request and posts form-encoded params', async () => {
    const fetchMock = vi.fn(async (_input: unknown, _init?: RequestInit) =>
      jsonResponse({ scrobbles: {} }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await lastfmPost({ method: 'track.scrobble', sk: 'sess', artist: 'Air' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(API_URL)
    expect(init?.method).toBe('POST')

    const body = new URLSearchParams(String(init?.body))
    expect(body.get('method')).toBe('track.scrobble')
    expect(body.get('api_key')).toBe('test-key')
    expect(body.get('sk')).toBe('sess')
    expect(body.get('format')).toBe('json')
    expect(body.get('api_sig')).toMatch(/^[a-f0-9]{32}$/)
  })

  it('produces a stable signature for identical params but different ones otherwise', async () => {
    const sigs: string[] = []
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      sigs.push(new URLSearchParams(String(init?.body)).get('api_sig') ?? '')
      return jsonResponse({ ok: 1 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await lastfmPost({ method: 'track.love', sk: 's', artist: 'A', track: 'X' })
    await lastfmPost({ method: 'track.love', sk: 's', artist: 'A', track: 'X' })
    await lastfmPost({ method: 'track.love', sk: 's', artist: 'A', track: 'Y' })

    expect(sigs[0]).toBe(sigs[1])
    expect(sigs[0]).not.toBe(sigs[2])
  })

  it('preserves the HTTP status when the error body is non-JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>oops</html>', { status: 503 })),
    )

    const err = await lastfmPost({ method: 'track.love', sk: 's' }).catch(
      (e) => e,
    )
    expect(err).toBeInstanceOf(LastfmApiError)
    expect((err as LastfmApiError).status).toBe(503)
  })
})

describe('getAuthToken / getSession', () => {
  it('returns the request token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ token: 'abc' })),
    )
    expect(await getAuthToken()).toBe('abc')
  })

  it('exchanges a token for a session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ session: { name: 'me', key: 'sk' } })),
    )
    expect(await getSession('tok')).toEqual({ name: 'me', key: 'sk' })
  })

  it('throws when Last.fm returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 4, message: 'bad token' })),
    )
    await expect(getAuthToken()).rejects.toThrow(/bad token/i)
  })
})
