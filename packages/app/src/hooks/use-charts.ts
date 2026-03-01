import { useQuery } from '@tanstack/react-query'
import { musicAPI, getChartData } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'

/**
 * Fetch the top-level catalog charts (songs, albums, playlists).
 */
export function useCharts(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.charts.catalog(limit),
    queryFn: () =>
      musicAPI('/v1/catalog/{{storefrontId}}/charts', {
        types: 'songs,albums,playlists',
        limit,
      }),
  })
}

/**
 * Fetch charts filtered by a specific genre.
 * The query is disabled when `genreId` is null.
 */
export function useGenreCharts(genreId: string | null) {
  return useQuery({
    queryKey: queryKeys.charts.genre(genreId ?? ''),
    queryFn: () =>
      musicAPI('/v1/catalog/{{storefrontId}}/charts', {
        types: 'songs,albums,playlists',
        genre: genreId!,
        limit: 20,
      }),
    enabled: genreId !== null,
  })
}

/**
 * Convenience re-export so pages don't need to import getChartData separately.
 */
export { getChartData }
