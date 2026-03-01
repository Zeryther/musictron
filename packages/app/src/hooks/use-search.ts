import { useQuery } from '@tanstack/react-query'
import { musicAPI } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'

/**
 * Search the Apple Music catalog.
 * The query is disabled when `term` is empty.
 */
export function useSearch(term: string) {
  return useQuery({
    queryKey: queryKeys.search.results(term),
    queryFn: () =>
      musicAPI('/v1/catalog/{{storefrontId}}/search', {
        term,
        types: 'songs,albums,artists,playlists',
        limit: 10,
      }),
    enabled: term.trim().length > 0,
  })
}

/**
 * Fetch search autocomplete hints.
 * The query is disabled when `term` is empty.
 */
export function useSearchHints(term: string) {
  return useQuery({
    queryKey: queryKeys.search.hints(term),
    queryFn: () =>
      musicAPI('/v1/catalog/{{storefrontId}}/search/hints', {
        term,
        limit: 5,
      }),
    enabled: term.trim().length > 0,
  })
}
