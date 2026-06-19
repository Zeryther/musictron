import type { ReactElement, ReactNode } from 'react'
import { render, type RenderResult } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { createQueryClient } from '@/lib/query-client'

/**
 * A QueryClient tuned for tests: no retries and no garbage-collection delay so
 * failures surface immediately and caches don't bleed between tests.
 */
export function createTestQueryClient(): QueryClient {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, gcTime: 0 } })
  return client
}

interface ProvidersProps {
  children: ReactNode
  queryClient: QueryClient
  route: string
}

function Providers({ children, queryClient, route }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

export interface RenderWithProvidersOptions {
  /** Initial MemoryRouter entry. Defaults to '/'. */
  route?: string
  /** Override the QueryClient (defaults to a fresh test client). */
  queryClient?: QueryClient
}

/**
 * Render a component wrapped in the providers the shared app expects
 * (React Query + a router). The host normally supplies the router, so tests
 * must too.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient()
  const route = options.route ?? '/'
  const result = render(
    <Providers queryClient={queryClient} route={route}>
      {ui}
    </Providers>,
  )
  return { ...result, queryClient }
}

/** Wrapper for `renderHook` that provides a QueryClientProvider. */
export function createQueryWrapper(
  queryClient: QueryClient = createTestQueryClient(),
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}
