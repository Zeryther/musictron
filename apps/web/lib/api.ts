import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { generateDeveloperToken, isConfigured } from './musickit-token'

/**
 * Musictron API — powered by Elysia, mounted inside Next.js.
 *
 * Endpoints:
 *   GET  /api/health          — server health check
 *   GET  /api/token            — get a MusicKit developer token
 *   GET  /api/config           — public client config (whether server is configured)
 */
export const api = new Elysia({ prefix: '/api' })
  .use(
    cors({
      // In production, restrict to your desktop app's origin.
      // For development, allow everything.
      origin: process.env.CORS_ORIGIN ?? true,
      methods: ['GET', 'OPTIONS'],
      credentials: false,
    }),
  )

  // ---------- Health ----------
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configured: isConfigured(),
  }))

  // ---------- Config ----------
  .get('/config', () => ({
    configured: isConfigured(),
    name: 'Musictron',
    version: '1.0.0',
  }))

  // ---------- Token ----------
  .get(
    '/token',
    async ({ status }) => {
      if (!isConfigured()) {
        return status(503, {
          error: 'Server is not configured with MusicKit credentials',
          hint: 'Set MUSICKIT_KEY_ID, MUSICKIT_TEAM_ID, and MUSICKIT_PRIVATE_KEY environment variables',
        })
      }

      try {
        const result = await generateDeveloperToken()
        return {
          token: result.token,
          expiresAt: result.expiresAt,
        }
      } catch (err) {
        console.error('[token] Failed to generate developer token:', err)
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
