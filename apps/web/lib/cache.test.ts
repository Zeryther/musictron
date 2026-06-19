import { describe, expect, it } from 'vitest'
import {
  applyCachePolicy,
  lastfmMetadataCache,
  noStoreCache,
  tokenCache,
  type CachePolicy,
} from '@web/lib/cache'

describe('applyCachePolicy', () => {
  it('sets browser, cdn, and vercel headers from the policy', () => {
    const headers: Record<string, string | number | undefined> = {}
    applyCachePolicy(headers, lastfmMetadataCache)

    expect(headers['cache-control']).toBe(lastfmMetadataCache.browser)
    expect(headers['cdn-cache-control']).toBe(lastfmMetadataCache.cdn)
    expect(headers['vercel-cdn-cache-control']).toBe(lastfmMetadataCache.vercel)
  })

  it('omits the vercel header when the policy has none', () => {
    const policy: CachePolicy = { browser: 'a', cdn: 'b' }
    const headers: Record<string, string | number | undefined> = {}
    applyCachePolicy(headers, policy)

    expect(headers['cache-control']).toBe('a')
    expect(headers['cdn-cache-control']).toBe('b')
    expect(headers['vercel-cdn-cache-control']).toBeUndefined()
  })
})

describe('cache policies', () => {
  it('keeps tokens and no-store responses out of all caches', () => {
    for (const policy of [tokenCache, noStoreCache]) {
      expect(policy.browser).toBe('no-store')
      expect(policy.cdn).toBe('no-store')
      expect(policy.vercel).toBe('no-store')
    }
  })
})
