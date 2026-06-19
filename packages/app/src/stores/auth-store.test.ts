import { describe, expect, it, vi } from 'vitest'
import { getMusicKitAuthErrorMessage, useAuthStore } from '@/stores/auth-store'
import { autoResetStores } from '@/test/store'

autoResetStores(useAuthStore)

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('useAuthStore.setDeveloperToken', () => {
  it('marks the token as manual with no expiry (never auto-refreshed)', () => {
    useAuthStore.getState().setDeveloperToken('my-token')

    const state = useAuthStore.getState()
    expect(state.developerToken).toBe('my-token')
    expect(state.tokenSource).toBe('manual')
    expect(state.tokenExpiresAt).toBeNull()
  })
})

describe('useAuthStore.checkServer', () => {
  it('sets serverConfigured true when the server reports configured', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ configured: true }))
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ serverUrl: 'http://localhost:3000' })

    const result = await useAuthStore.getState().checkServer()

    expect(result).toBe(true)
    expect(useAuthStore.getState().serverConfigured).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/health',
      expect.anything(),
    )
  })

  it('returns false when the server reports unconfigured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ configured: false })),
    )
    useAuthStore.setState({ serverUrl: 'http://localhost:3000' })

    expect(await useAuthStore.getState().checkServer()).toBe(false)
    expect(useAuthStore.getState().serverConfigured).toBe(false)
  })

  it('returns false on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    )
    useAuthStore.setState({ serverUrl: 'http://localhost:3000' })

    expect(await useAuthStore.getState().checkServer()).toBe(false)
  })

  it('returns false when the request throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network')
      }),
    )
    useAuthStore.setState({ serverUrl: 'http://localhost:3000' })

    expect(await useAuthStore.getState().checkServer()).toBe(false)
    expect(useAuthStore.getState().serverConfigured).toBe(false)
  })
})

describe('getMusicKitAuthErrorMessage', () => {
  it('maps MusicKit load failures', () => {
    expect(
      getMusicKitAuthErrorMessage(
        new Error('Failed to load MusicKit JS'),
        'initialize',
      ),
    ).toMatch(/Failed to load MusicKit/i)
  })

  it('maps authorization failures', () => {
    expect(
      getMusicKitAuthErrorMessage(new Error('403 Forbidden'), 'authorize'),
    ).toMatch(/rejected this session/i)
  })

  it('falls back to the raw message', () => {
    expect(getMusicKitAuthErrorMessage(new Error('weird'), 'authorize')).toBe(
      'weird',
    )
  })
})
