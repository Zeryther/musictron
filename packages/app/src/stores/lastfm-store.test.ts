import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLastfmStore } from '@/stores/lastfm-store'
import { installTestConfig } from '@/test/platform'
import { autoResetStores } from '@/test/store'

autoResetStores(useLastfmStore)

beforeEach(() => {
  installTestConfig({ serverUrl: 'http://localhost:3000' })
})

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('useLastfmStore.checkServer', () => {
  it('reports configured from the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ configured: true })),
    )
    expect(await useLastfmStore.getState().checkServer()).toBe(true)
    expect(useLastfmStore.getState().serverConfigured).toBe(true)
  })

  it('returns false when the request throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network')
      }),
    )
    expect(await useLastfmStore.getState().checkServer()).toBe(false)
    expect(useLastfmStore.getState().serverConfigured).toBe(false)
  })
})

describe('useLastfmStore.startAuth', () => {
  it('returns the auth url and token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ url: 'https://last.fm/auth', token: 'tok' }),
      ),
    )
    expect(await useLastfmStore.getState().startAuth()).toEqual({
      url: 'https://last.fm/auth',
      token: 'tok',
    })
  })

  it('returns null on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    )
    expect(await useLastfmStore.getState().startAuth()).toBeNull()
  })
})

describe('useLastfmStore mutations', () => {
  it('disconnect clears session state', () => {
    useLastfmStore.setState({
      isConnected: true,
      sessionKey: 'sk',
      username: 'me',
    })

    useLastfmStore.getState().disconnect()

    const state = useLastfmStore.getState()
    expect(state.isConnected).toBe(false)
    expect(state.sessionKey).toBeNull()
    expect(state.username).toBeNull()
  })

  it('toggles scrobbling and now-playing flags', () => {
    useLastfmStore.getState().setScrobblingEnabled(false)
    useLastfmStore.getState().setNowPlayingEnabled(false)

    expect(useLastfmStore.getState().scrobblingEnabled).toBe(false)
    expect(useLastfmStore.getState().nowPlayingEnabled).toBe(false)
  })
})
