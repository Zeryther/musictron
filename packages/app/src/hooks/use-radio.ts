import { useQuery } from '@tanstack/react-query'
import { musicAPI, getChartData } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'

/**
 * Fetch live radio stations from the catalog.
 */
export function useStations() {
  return useQuery({
    queryKey: queryKeys.radio.stations(),
    queryFn: async () => {
      const data = await musicAPI('/v1/catalog/{{storefrontId}}/stations', {
        limit: 20,
        'filter[featured]': 'apple-music-live-radio',
      })
      return (data.data ?? []) as MusicKit.Resource[]
    },
  })
}

/**
 * Fetch featured playlist charts (used as radio "mixes" fallback).
 */
export function useFeaturedPlaylists() {
  return useQuery({
    queryKey: queryKeys.radio.featured(),
    queryFn: async () => {
      const data = await musicAPI('/v1/catalog/{{storefrontId}}/charts', {
        types: 'playlists',
        limit: 20,
      })
      return getChartData(data.results?.playlists)
    },
  })
}
