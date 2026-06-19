import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLastfmArtist } from '@/hooks/use-lastfm'
import { useLastfmStore } from '@/stores/lastfm-store'
import { createQueryWrapper } from '@/test/render'
import { installTestConfig } from '@/test/platform'
import { autoResetStores } from '@/test/store'

autoResetStores(useLastfmStore)

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  installTestConfig({ serverUrl: 'http://localhost:3000' })
})

describe('useLastfmArtist', () => {
  it('does not fetch when the server is not configured', () => {
    useLastfmStore.setState({ serverConfigured: false })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useLastfmArtist('Air'), { wrapper: createQueryWrapper() })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches artist info through the server proxy when configured', async () => {
    useLastfmStore.setState({ serverConfigured: true })
    const fetchMock = vi.fn(async (_input: unknown) =>
      jsonResponse({ artist: { name: 'Air', url: 'https://last.fm/air' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useLastfmArtist('Air'), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.name).toBe('Air')
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('http://localhost:3000/api/lastfm/artist')
    expect(url).toContain('artist=Air')
  })
})
