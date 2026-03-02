/**
 * Last.fm API routes for the Elysia server.
 *
 * These routes proxy all Last.fm API calls through the server so that the
 * API secret is never exposed to the client. The Last.fm session key (sk)
 * is passed from the client for authenticated (write) calls.
 *
 * Read-only metadata endpoints set Cache-Control headers so CDNs and
 * browsers cache responses without hitting Last.fm on every request.
 */

import { Elysia, t } from 'elysia'
import {
  isLastfmConfigured,
  getAuthToken,
  buildAuthUrl,
  getSession,
  lastfmGet,
  lastfmPost,
  type LastfmArtistInfo,
  type LastfmAlbumInfo,
  type LastfmTrackInfo,
  type LastfmSimilarArtists,
  type LastfmSimilarTracks,
  type LastfmScrobbleResponse,
  type LastfmNowPlayingResponse,
} from './lastfm'

// ─── Cache Configuration ─────────────────────────────────────────────────────

/**
 * Cache-Control header for cacheable metadata responses.
 *
 *   max-age=300                — browsers reuse cached response for 5 minutes
 *   s-maxage=3600              — CDN serves cached response for 1 hour
 *   stale-while-revalidate=18000 — CDN may serve stale for up to 5 hours
 *                                  while revalidating in the background
 *   stale-if-error=86400       — CDN serves stale for 24h if origin errors
 *                                  (e.g. Last.fm is down)
 */
const METADATA_CACHE_CONTROL =
  'public, max-age=300, s-maxage=3600, stale-while-revalidate=18000, stale-if-error=86400'

// ─── Routes ──────────────────────────────────────────────────────────────────

export const lastfmRoutes = new Elysia({ prefix: '/lastfm' })

  // ── Health / Config ──────────────────────────────────────────────────────

  .get('/status', () => ({
    configured: isLastfmConfigured(),
  }))

  // ── Authentication ───────────────────────────────────────────────────────

  .get('/auth/start', async ({ status }) => {
    if (!isLastfmConfigured()) {
      return status(503, {
        error: 'Last.fm is not configured on this server',
      })
    }

    try {
      const token = await getAuthToken()
      const url = buildAuthUrl(token)

      return { url, token }
    } catch (err) {
      console.error('[lastfm] auth/start error:', err)
      return status(500, {
        error: 'Failed to get Last.fm auth token',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  })

  .post(
    '/auth/session',
    async ({ body, status }) => {
      if (!body.token) {
        return status(400, { error: 'Missing token' })
      }

      try {
        const session = await getSession(body.token)
        return { sessionKey: session.key, username: session.name }
      } catch (err) {
        console.error('[lastfm] auth/session error:', err)
        return status(500, {
          error: 'Failed to exchange token for session',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      body: t.Object({
        token: t.String(),
      }),
    },
  )

  // ── Metadata (read-only, cached) ────────────────────────────────────────

  .get(
    '/artist',
    async ({ query, status, set }) => {
      if (!isLastfmConfigured()) {
        return status(503, { error: 'Last.fm is not configured' })
      }

      try {
        const data = await lastfmGet<LastfmArtistInfo>({
          method: 'artist.getInfo',
          artist: query.artist,
          mbid: query.mbid,
          autocorrect: 1,
          lang: query.lang,
          username: query.username,
        })
        set.headers['cache-control'] = METADATA_CACHE_CONTROL
        return data
      } catch (err) {
        console.error('[lastfm] artist.getInfo error:', err)
        return status(500, {
          error: 'Failed to fetch artist info',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      query: t.Object({
        artist: t.Optional(t.String()),
        mbid: t.Optional(t.String()),
        lang: t.Optional(t.String()),
        username: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/artist/similar',
    async ({ query, status, set }) => {
      if (!isLastfmConfigured()) {
        return status(503, { error: 'Last.fm is not configured' })
      }

      try {
        const data = await lastfmGet<LastfmSimilarArtists>({
          method: 'artist.getSimilar',
          artist: query.artist,
          mbid: query.mbid,
          limit: query.limit,
          autocorrect: 1,
        })
        set.headers['cache-control'] = METADATA_CACHE_CONTROL
        return data
      } catch (err) {
        console.error('[lastfm] artist.getSimilar error:', err)
        return status(500, {
          error: 'Failed to fetch similar artists',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      query: t.Object({
        artist: t.Optional(t.String()),
        mbid: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/album',
    async ({ query, status, set }) => {
      if (!isLastfmConfigured()) {
        return status(503, { error: 'Last.fm is not configured' })
      }

      try {
        const data = await lastfmGet<LastfmAlbumInfo>({
          method: 'album.getInfo',
          artist: query.artist,
          album: query.album,
          mbid: query.mbid,
          autocorrect: 1,
          lang: query.lang,
          username: query.username,
        })
        set.headers['cache-control'] = METADATA_CACHE_CONTROL
        return data
      } catch (err) {
        console.error('[lastfm] album.getInfo error:', err)
        return status(500, {
          error: 'Failed to fetch album info',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      query: t.Object({
        artist: t.Optional(t.String()),
        album: t.Optional(t.String()),
        mbid: t.Optional(t.String()),
        lang: t.Optional(t.String()),
        username: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/track',
    async ({ query, status, set }) => {
      if (!isLastfmConfigured()) {
        return status(503, { error: 'Last.fm is not configured' })
      }

      try {
        const data = await lastfmGet<LastfmTrackInfo>({
          method: 'track.getInfo',
          artist: query.artist,
          track: query.track,
          mbid: query.mbid,
          autocorrect: 1,
          username: query.username,
        })
        set.headers['cache-control'] = METADATA_CACHE_CONTROL
        return data
      } catch (err) {
        console.error('[lastfm] track.getInfo error:', err)
        return status(500, {
          error: 'Failed to fetch track info',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      query: t.Object({
        artist: t.Optional(t.String()),
        track: t.Optional(t.String()),
        mbid: t.Optional(t.String()),
        username: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/track/similar',
    async ({ query, status, set }) => {
      if (!isLastfmConfigured()) {
        return status(503, { error: 'Last.fm is not configured' })
      }

      try {
        const data = await lastfmGet<LastfmSimilarTracks>({
          method: 'track.getSimilar',
          artist: query.artist,
          track: query.track,
          mbid: query.mbid,
          limit: query.limit,
          autocorrect: 1,
        })
        set.headers['cache-control'] = METADATA_CACHE_CONTROL
        return data
      } catch (err) {
        console.error('[lastfm] track.getSimilar error:', err)
        return status(500, {
          error: 'Failed to fetch similar tracks',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      query: t.Object({
        artist: t.Optional(t.String()),
        track: t.Optional(t.String()),
        mbid: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )

  // ── Scrobbling (authenticated, no caching) ──────────────────────────────

  .post(
    '/now-playing',
    async ({ body, status }) => {
      if (!isLastfmConfigured()) {
        return status(503, { error: 'Last.fm is not configured' })
      }
      if (!body.sk) {
        return status(401, { error: 'Missing Last.fm session key' })
      }

      try {
        const data = await lastfmPost<LastfmNowPlayingResponse>({
          method: 'track.updateNowPlaying',
          artist: body.artist,
          track: body.track,
          album: body.album,
          duration: body.duration,
          sk: body.sk,
        })
        return data
      } catch (err) {
        console.error('[lastfm] track.updateNowPlaying error:', err)
        return status(500, {
          error: 'Failed to update now playing',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      body: t.Object({
        artist: t.String(),
        track: t.String(),
        album: t.Optional(t.String()),
        duration: t.Optional(t.Number()),
        sk: t.String(),
      }),
    },
  )

  .post(
    '/scrobble',
    async ({ body, status }) => {
      if (!isLastfmConfigured()) {
        return status(503, { error: 'Last.fm is not configured' })
      }
      if (!body.sk) {
        return status(401, { error: 'Missing Last.fm session key' })
      }

      try {
        // Support both single scrobble and batch (up to 50)
        const scrobbles = body.scrobbles ?? [
          {
            artist: body.artist ?? '',
            track: body.track ?? '',
            timestamp: body.timestamp ?? Math.floor(Date.now() / 1000),
            album: body.album,
            duration: body.duration,
          },
        ]

        // Build the indexed params for batch scrobbles
        const params: Record<string, string | number | undefined> = {
          method: 'track.scrobble',
          sk: body.sk,
        }

        for (let i = 0; i < Math.min(scrobbles.length, 50); i++) {
          const s = scrobbles[i]
          params[`artist[${i}]`] = s.artist
          params[`track[${i}]`] = s.track
          params[`timestamp[${i}]`] = s.timestamp
          if (s.album) params[`album[${i}]`] = s.album
          if (s.duration) params[`duration[${i}]`] = s.duration
        }

        const data = await lastfmPost<LastfmScrobbleResponse>(
          params as Record<string, string | number | undefined> & {
            method: string
            sk: string
          },
        )
        return data
      } catch (err) {
        console.error('[lastfm] track.scrobble error:', err)
        const code = (err as { code?: number }).code
        return status(500, {
          error: 'Failed to scrobble',
          message: err instanceof Error ? err.message : 'Unknown error',
          retryable: code === 11 || code === 16,
        })
      }
    },
    {
      body: t.Object({
        // Single scrobble fields
        artist: t.Optional(t.String()),
        track: t.Optional(t.String()),
        timestamp: t.Optional(t.Number()),
        album: t.Optional(t.String()),
        duration: t.Optional(t.Number()),
        // Batch scrobbles
        scrobbles: t.Optional(
          t.Array(
            t.Object({
              artist: t.String(),
              track: t.String(),
              timestamp: t.Number(),
              album: t.Optional(t.String()),
              duration: t.Optional(t.Number()),
            }),
          ),
        ),
        // Auth
        sk: t.String(),
      }),
    },
  )

  // ── Love / Unlove (authenticated, no caching) ──────────────────────────

  .post(
    '/love',
    async ({ body, status }) => {
      if (!isLastfmConfigured()) {
        return status(503, { error: 'Last.fm is not configured' })
      }
      if (!body.sk) {
        return status(401, { error: 'Missing Last.fm session key' })
      }

      try {
        const data = await lastfmPost({
          method: 'track.love',
          artist: body.artist,
          track: body.track,
          sk: body.sk,
        })
        return data
      } catch (err) {
        console.error('[lastfm] track.love error:', err)
        return status(500, {
          error: 'Failed to love track',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      body: t.Object({
        artist: t.String(),
        track: t.String(),
        sk: t.String(),
      }),
    },
  )

  .post(
    '/unlove',
    async ({ body, status }) => {
      if (!isLastfmConfigured()) {
        return status(503, { error: 'Last.fm is not configured' })
      }
      if (!body.sk) {
        return status(401, { error: 'Missing Last.fm session key' })
      }

      try {
        const data = await lastfmPost({
          method: 'track.unlove',
          artist: body.artist,
          track: body.track,
          sk: body.sk,
        })
        return data
      } catch (err) {
        console.error('[lastfm] track.unlove error:', err)
        return status(500, {
          error: 'Failed to unlove track',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    {
      body: t.Object({
        artist: t.String(),
        track: t.String(),
        sk: t.String(),
      }),
    },
  )
