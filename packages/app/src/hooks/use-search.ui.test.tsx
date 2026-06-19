import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type * as MusicKitModule from '@/lib/musickit'
import { useSearch } from '@/hooks/use-search'
import { musicAPI } from '@/lib/musickit'
import { createQueryWrapper } from '@/test/render'

vi.mock('@/lib/musickit', async (importOriginal) => {
  const actual = await importOriginal<typeof MusicKitModule>()
  return { ...actual, musicAPI: vi.fn() }
})

describe('useSearch', () => {
  it('is disabled for an empty term (no request)', () => {
    renderHook(() => useSearch(''), { wrapper: createQueryWrapper() })
    expect(vi.mocked(musicAPI)).not.toHaveBeenCalled()
  })

  it('queries the catalog search endpoint for a non-empty term', async () => {
    vi.mocked(musicAPI).mockResolvedValue({ results: {} })

    const { result } = renderHook(() => useSearch('daft punk'), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(vi.mocked(musicAPI)).toHaveBeenCalledWith(
      '/v1/catalog/{{storefrontId}}/search',
      expect.objectContaining({ term: 'daft punk', limit: 10 }),
    )
  })
})
