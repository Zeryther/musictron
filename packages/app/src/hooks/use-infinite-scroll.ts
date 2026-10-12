import { useEffect, useState } from 'react'

interface UseInfiniteScrollOptions {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  /** Pause auto-loading after a failed page so it doesn't retry in a loop. */
  isFetchNextPageError?: boolean
  fetchNextPage: () => unknown
  enabled?: boolean
  rootMargin?: string
}

/**
 * Load the next page whenever the returned sentinel ref scrolls into view.
 *
 * Returns a callback ref so the observer attaches whenever the sentinel
 * mounts (e.g. after a loading spinner is replaced by content), not only on
 * the first render. The observer is recreated after each page settles, and a
 * new observer reports its initial intersection, so pages keep loading while
 * the sentinel stays visible (short pages, tall windows).
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError = false,
  fetchNextPage,
  enabled = true,
  rootMargin = '600px',
}: UseInfiniteScrollOptions) {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (
      !sentinel ||
      !enabled ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError
    ) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          fetchNextPage()
        }
      },
      { rootMargin },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    sentinel,
    enabled,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    rootMargin,
  ])

  return setSentinel
}
