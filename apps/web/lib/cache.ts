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

// Keep MusicKit developer tokens out of browser/CDN caches. The server keeps a
// short-lived in-memory copy and re-mints it before clients need to refresh.
export const tokenCache: CachePolicy = {
  browser: 'no-store',
  cdn: 'no-store',
  vercel: 'no-store',
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
