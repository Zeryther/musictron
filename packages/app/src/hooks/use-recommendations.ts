import { useQuery } from '@tanstack/react-query'
import { musicAPI } from '@/lib/musickit'
import { queryKeys } from '@/lib/query-keys'

/**
 * Fetch personalized recommendations.
 * Requires the user to be authorized.
 */
export function useRecommendations(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.recommendations(),
    queryFn: async () => {
      const data = await musicAPI('/v1/me/recommendations', { limit: 10 })
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled,
  })
}

/**
 * Fetch recently played items.
 * Requires the user to be authorized.
 */
export function useRecentlyPlayed(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.recentlyPlayed(),
    queryFn: async () => {
      const data = await musicAPI('/v1/me/recent/played', { limit: 10 })
      return (data.data ?? []) as MusicKit.Resource[]
    },
    enabled,
  })
}
