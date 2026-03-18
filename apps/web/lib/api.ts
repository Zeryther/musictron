import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { generateDeveloperToken, isConfigured } from './musickit-token'
import { lastfmRoutes } from './lastfm-routes'
import { isLastfmConfigured } from './lastfm'
import {
  applyCachePolicy,
  noStoreCache,
  publicConfigCache,
  tokenCache,
} from './cache'

/**
 * Musictron API — powered by Elysia, mounted inside Next.js.
 *
 * Endpoints:
 *   GET  /api/health              — server health check
 *   GET  /api/token               — get a MusicKit developer token
 *   GET  /api/config              — public client config (whether server is configured)
 *   /api/lastfm/*                 — Last.fm API proxy (see lastfm-routes.ts)
 */
export const api = new Elysia({ prefix: '/api' })
  .use(
    cors({
      // In production, restrict to your desktop app's origin.
      // For development, allow everything.
      origin: process.env.CORS_ORIGIN ?? true,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: false,
    }),
  )

  // ---------- Last.fm routes ----------
  .use(lastfmRoutes)

  // ---------- Health ----------
  .get('/health', ({ set }) => {
    applyCachePolicy(set.headers, noStoreCache)

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      configured: isConfigured(),
      lastfmConfigured: isLastfmConfigured(),
    }
  })

  // ---------- Config ----------
  .get('/config', ({ set }) => {
    applyCachePolicy(set.headers, publicConfigCache)

    return {
      configured: isConfigured(),
      lastfmConfigured: isLastfmConfigured(),
      name: 'Musictron',
      version: '1.0.0',
    }
  })

  // ---------- Token ----------
  .get(
    '/token',
    async ({ status, set }) => {
      if (!isConfigured()) {
        applyCachePolicy(set.headers, noStoreCache)

        return status(503, {
          error: 'Server is not configured with MusicKit credentials',
          hint: 'Set MUSICKIT_KEY_ID, MUSICKIT_TEAM_ID, and MUSICKIT_PRIVATE_KEY environment variables',
        })
      }

      try {
        const result = await generateDeveloperToken()
        applyCachePolicy(set.headers, tokenCache)

        return {
          token: result.token,
          expiresAt: result.expiresAt,
        }
      } catch (err) {
        console.error('[token] Failed to generate developer token:', err)
        applyCachePolicy(set.headers, noStoreCache)

        return status(500, {
          error: 'Failed to generate developer token',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      detail: {
        summary: 'Get MusicKit developer token',
        description:
          'Returns a short-lived MusicKit developer token (ES256 JWT) for use with Apple Music API and MusicKit JS. The token is cached server-side and rotated automatically.',
      },
    },
  )

// Export the Elysia app type for Eden client type inference
export type API = typeof api
