import { api } from '@web/lib/api'

/**
 * Drive the Elysia app the same way Next.js does in production
 * (`api.handle(new Request(...))`) — no live HTTP server needed.
 * Paths must include the `/api` prefix, e.g. `/api/health`.
 */
export function apiRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return api.handle(new Request(`http://localhost${path}`, init))
}

export async function apiJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T }> {
  const res = await apiRequest(path, init)
  const body = (await res.json()) as T
  return { status: res.status, body }
}

/** Convenience for JSON POST bodies. */
export function jsonPost(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
