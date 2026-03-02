/**
 * React Query hooks for fetching Last.fm metadata.
 *
 * All calls go through our API server (which adds the API key server-side).
 * These are read-only endpoints — no user auth needed.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getAppConfig } from '@/lib/platform'
import { useLastfmStore } from '@/stores/lastfm-store'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LastfmArtistData {
  name: string
  url: string
  listeners?: number
  playcount?: number
  bio?: {
    summary: string
    content: string
  }
  tags: string[]
  similar: Array<{
    name: string
    url: string
  }>
}

export interface LastfmAlbumData {
  name: string
  artist: string
  url: string
  listeners?: number
  playcount?: number
  tags: string[]
  wiki?: {
    summary: string
    content: string
  }
}

export interface LastfmTrackData {
  name: string
  artist: string
  url: string
  listeners?: number
  playcount?: number
  userLoved?: boolean
  tags: string[]
  wiki?: {
    summary: string
    content: string
  }
}

export interface LastfmSimilarArtist {
  name: string
  url: string
  match: number
}

export interface LastfmSimilarTrack {
  name: string
  artist: string
  url: string
  match: number
  playcount?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function lastfmFetch<T>(
  path: string,
  params: Record<string, string | undefined>,
): Promise<T> {
  const { serverUrl } = getAppConfig()

  const query = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined) query.set(key, val)
  }

  const res = await fetch(
    `${serverUrl}/api/lastfm/${path}?${query.toString()}`,
    {
      signal: AbortSignal.timeout(10000),
    },
  )

  if (!res.ok) {
    throw new Error(`Last.fm API error: ${res.status}`)
  }

  return res.json()
}

/** Strip HTML tags from Last.fm bio/wiki content */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch extended artist info from Last.fm.
 * Returns biography, listener/play counts, tags, and similar artists.
 */
export function useLastfmArtist(artistName: string | undefined) {
  const serverConfigured = useLastfmStore((s) => s.serverConfigured)

  return useQuery({
    queryKey: queryKeys.lastfm.artist(artistName ?? ''),
    queryFn: async (): Promise<LastfmArtistData | null> => {
      const data = await lastfmFetch<{
        artist: {
          name: string
          url: string
          stats?: { listeners: string; playcount: string }
          bio?: { summary: string; content: string }
          tags?: { tag: Array<{ name: string }> | { name: string } }
          similar?: {
            artist:
              | Array<{ name: string; url: string }>
              | { name: string; url: string }
          }
        }
      }>('artist', { artist: artistName })

      if (!data.artist) return null

      const a = data.artist
      const tags = Array.isArray(a.tags?.tag)
        ? a.tags.tag.map((t) => t.name)
        : a.tags?.tag
          ? [a.tags.tag.name]
          : []

      const similar = Array.isArray(a.similar?.artist)
        ? a.similar.artist.map((s) => ({ name: s.name, url: s.url }))
        : a.similar?.artist
          ? [{ name: a.similar.artist.name, url: a.similar.artist.url }]
          : []

      return {
        name: a.name,
        url: a.url,
        listeners: a.stats?.listeners
          ? parseInt(a.stats.listeners, 10)
          : undefined,
        playcount: a.stats?.playcount
          ? parseInt(a.stats.playcount, 10)
          : undefined,
        bio: a.bio?.summary
          ? {
              summary: stripHtml(a.bio.summary),
              content: stripHtml(a.bio.content),
            }
          : undefined,
        tags,
        similar,
      }
    },
    enabled: !!artistName && serverConfigured === true,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  })
}

/**
 * Fetch similar artists from Last.fm.
 */
export function useLastfmSimilarArtists(
  artistName: string | undefined,
  limit: number = 10,
) {
  const serverConfigured = useLastfmStore((s) => s.serverConfigured)

  return useQuery({
    queryKey: queryKeys.lastfm.similarArtists(artistName ?? ''),
    queryFn: async (): Promise<LastfmSimilarArtist[]> => {
      const data = await lastfmFetch<{
        similarartists: {
          artist: Array<{
            name: string
            url: string
            match: string
          }>
        }
      }>('artist/similar', {
        artist: artistName,
        limit: String(limit),
      })

      if (!data.similarartists?.artist) return []

      const artists = Array.isArray(data.similarartists.artist)
        ? data.similarartists.artist
        : [data.similarartists.artist]

      return artists.map((a) => ({
        name: a.name,
        url: a.url,
        match: parseFloat(a.match),
      }))
    },
    enabled: !!artistName && serverConfigured === true,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })
}

/**
 * Fetch extended album info from Last.fm.
 */
export function useLastfmAlbum(
  artistName: string | undefined,
  albumName: string | undefined,
) {
  const serverConfigured = useLastfmStore((s) => s.serverConfigured)

  return useQuery({
    queryKey: queryKeys.lastfm.album(artistName ?? '', albumName ?? ''),
    queryFn: async (): Promise<LastfmAlbumData | null> => {
      const data = await lastfmFetch<{
        album: {
          name: string
          artist: string
          url: string
          listeners: string
          playcount: string
          tags?: { tag: Array<{ name: string }> | { name: string } }
          wiki?: { summary: string; content: string }
        }
      }>('album', { artist: artistName, album: albumName })

      if (!data.album) return null

      const a = data.album
      const tags = Array.isArray(a.tags?.tag)
        ? a.tags.tag.map((t) => t.name)
        : a.tags?.tag
          ? [a.tags.tag.name]
          : []

      return {
        name: a.name,
        artist: a.artist,
        url: a.url,
        listeners: a.listeners ? parseInt(a.listeners, 10) : undefined,
        playcount: a.playcount ? parseInt(a.playcount, 10) : undefined,
        tags,
        wiki: a.wiki?.summary
          ? {
              summary: stripHtml(a.wiki.summary),
              content: stripHtml(a.wiki.content),
            }
          : undefined,
      }
    },
    enabled: !!artistName && !!albumName && serverConfigured === true,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })
}

/**
 * Fetch extended track info from Last.fm.
 *
 * When the user is connected to Last.fm, the `username` parameter is
 * included so that the response contains the `userloved` field.
 */
export function useLastfmTrack(
  artistName: string | undefined,
  trackName: string | undefined,
) {
  const serverConfigured = useLastfmStore((s) => s.serverConfigured)
  const username = useLastfmStore((s) => s.username)

  return useQuery({
    queryKey: queryKeys.lastfm.track(artistName ?? '', trackName ?? ''),
    queryFn: async (): Promise<LastfmTrackData | null> => {
      const data = await lastfmFetch<{
        track: {
          name: string
          url: string
          listeners: string
          playcount: string
          userloved?: string
          artist: { name: string }
          toptags?: { tag: Array<{ name: string }> | { name: string } }
          wiki?: { summary: string; content: string }
        }
      }>('track', {
        artist: artistName,
        track: trackName,
        username: username ?? undefined,
      })

      if (!data.track) return null

      const t = data.track
      const tags = Array.isArray(t.toptags?.tag)
        ? t.toptags.tag.map((tg) => tg.name)
        : t.toptags?.tag
          ? [t.toptags.tag.name]
          : []

      return {
        name: t.name,
        artist: t.artist.name,
        url: t.url,
        listeners: t.listeners ? parseInt(t.listeners, 10) : undefined,
        playcount: t.playcount ? parseInt(t.playcount, 10) : undefined,
        userLoved: t.userloved === '1',
        tags,
        wiki: t.wiki?.summary
          ? {
              summary: stripHtml(t.wiki.summary),
              content: stripHtml(t.wiki.content),
            }
          : undefined,
      }
    },
    enabled: !!artistName && !!trackName && serverConfigured === true,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })
}

// ─── Love / Unlove Mutation ──────────────────────────────────────────────────

/**
 * Mutation hook for loving/unloving a track on Last.fm.
 */
export function useLastfmLove() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      artist,
      track,
      love,
    }: {
      artist: string
      track: string
      love: boolean
    }) => {
      const { serverUrl } = getAppConfig()
      const { sessionKey } = useLastfmStore.getState()
      if (!sessionKey) throw new Error('Not connected to Last.fm')

      const endpoint = love ? 'love' : 'unlove'
      const res = await fetch(`${serverUrl}/api/lastfm/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist, track, sk: sessionKey }),
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        throw new Error(`Failed to ${endpoint} track`)
      }

      return res.json()
    },
    onSuccess: (_data, { artist, track }) => {
      // Invalidate the track's Last.fm data so it refreshes
      queryClient.invalidateQueries({
        queryKey: queryKeys.lastfm.track(artist, track),
      })
    },
  })
}
