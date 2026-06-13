/**
 * Cache policy helpers for API responses.
 *
 * Vercel can cache function responses at the CDN layer from standard
 * Cache-Control headers, but targeted CDN headers make the behavior explicit
 * and let us keep browser caching separate from edge caching.
 */

export interface CachePolicy {
  browser: string
  cdn: string
  vercel?: string
}

export const lastfmMetadataCache: CachePolicy = {
  browser:
    'public, max-age=300, stale-while-revalidate=18000, stale-if-error=86400',
  cdn: 'public, s-maxage=3600, stale-while-revalidate=18000, stale-if-error=86400',
  vercel:
    'public, s-maxage=3600, stale-while-revalidate=18000, stale-if-error=86400',
}

export const publicConfigCache: CachePolicy = {
  browser: 'public, max-age=300, stale-while-revalidate=600',
  cdn: 'public, s-maxage=3600, stale-while-revalidate=21600',
  vercel: 'public, s-maxage=3600, stale-while-revalidate=21600',
}

// The dev token is long-lived (~6 months), so the edge copy never needs to be
// fresh to the minute. A 1h s-maxage avoids constant revalidation while staying
// far under the token lifetime, so a key rotation (invalidateCache) still
// propagates within ~1h. The browser must always revalidate — the in-app store,
// not the HTTP cache, owns client-side token reuse and refresh.
export const tokenCache: CachePolicy = {
  browser: 'public, max-age=0, must-revalidate',
  cdn: 'public, s-maxage=3600, stale-while-revalidate=86400',
  vercel: 'public, s-maxage=3600, stale-while-revalidate=86400',
}

export const noStoreCache: CachePolicy = {
  browser: 'no-store',
  cdn: 'no-store',
  vercel: 'no-store',
}

export function applyCachePolicy(
  headers: Record<string, string | number | undefined>,
  policy: CachePolicy,
): void {
  headers['cache-control'] = policy.browser
  headers['cdn-cache-control'] = policy.cdn

  if (policy.vercel) {
    headers['vercel-cdn-cache-control'] = policy.vercel
  }
}
