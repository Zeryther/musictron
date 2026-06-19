import { QueryClient } from '@tanstack/react-query'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data fresh for 2 minutes; stale data is still shown while
        // refetching in the background.
        staleTime: 2 * 60 * 1000,
        // Cache unused queries for 5 minutes before garbage-collecting.
        gcTime: 5 * 60 * 1000,
        // Retry once before surfacing an error.
        retry: 1,
        // Don't refetch when the window regains focus.
        refetchOnWindowFocus: false,
      },
    },
  })
}
