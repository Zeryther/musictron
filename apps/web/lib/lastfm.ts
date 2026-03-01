/**
 * Last.fm API client utility.
 *
 * All Last.fm API calls are proxied through this server-side module so that
 * the API secret is never exposed to the client. The API key is also kept
 * server-side — only the user's session key (sk) is held client-side.
 *
 * @see https://www.last.fm/api
 */

import crypto from 'node:crypto'

// ─── Configuration ───────────────────────────────────────────────────────────

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/'

function getApiKey(): string {
  const key = process.env.LASTFM_API_KEY
  if (!key) throw new Error('Missing LASTFM_API_KEY environment variable')
  return key
}

function getApiSecret(): string {
  const secret = process.env.LASTFM_SECRET
  if (!secret) throw new Error('Missing LASTFM_SECRET environment variable')
  return secret
}

/** Check whether Last.fm credentials are configured. */
export function isLastfmConfigured(): boolean {
  return !!(process.env.LASTFM_API_KEY && process.env.LASTFM_SECRET)
}

// ─── Signature Generation ────────────────────────────────────────────────────

/**
 * Generate the `api_sig` for a Last.fm API call.
 *
 * Per the spec: sort params alphabetically, concatenate as `<name><value>`,
 * append the shared secret, then MD5 hash the result.
 *
 * The `format` and `callback` params are excluded from the signature.
 */
function generateSignature(params: Record<string, string>): string {
  const secret = getApiSecret()

  const filtered = Object.entries(params).filter(
    ([key]) => key !== 'format' && key !== 'callback',
  )

  filtered.sort(([a], [b]) => a.localeCompare(b))

  const sigString =
    filtered.map(([key, val]) => `${key}${val}`).join('') + secret

  return crypto.createHash('md5').update(sigString, 'utf8').digest('hex')
}

// ─── Low-level API helpers ───────────────────────────────────────────────────

/** Parameters for a read-only (GET) Last.fm API call. */
interface GetParams {
  method: string
  [key: string]: string | number | undefined
}

/** Parameters for an authenticated write (POST) Last.fm API call. */
interface PostParams {
  method: string
  sk: string
  [key: string]: string | number | undefined
}

/**
 * Make an unauthenticated GET request to the Last.fm API.
 * Used for read-only metadata endpoints (artist.getInfo, album.getInfo, etc.)
 */
export async function lastfmGet<T = Record<string, unknown>>(
  params: GetParams,
): Promise<T> {
  const apiKey = getApiKey()

  const query = new URLSearchParams({
    api_key: apiKey,
    format: 'json',
  })

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      query.set(key, String(val))
    }
  }

  const res = await fetch(`${LASTFM_API_URL}?${query.toString()}`)

  if (!res.ok) {
    throw new Error(`Last.fm API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  // Last.fm returns error objects inside a 200 response
  if (data.error) {
    const err = new Error(
      data.message || `Last.fm error ${data.error}`,
    ) as Error & { code: number }
    err.code = data.error
    throw err
  }

  return data as T
}

/**
 * Make an authenticated POST request to the Last.fm API.
 * Used for write endpoints (track.scrobble, track.updateNowPlaying, etc.)
 *
 * The api_key and api_sig are added server-side. The caller must provide
 * the user's session key (sk).
 */
export async function lastfmPost<T = Record<string, unknown>>(
  params: PostParams,
): Promise<T> {
  const apiKey = getApiKey()

  // Build the full param set (excluding undefined values)
  const fullParams: Record<string, string> = {
    api_key: apiKey,
  }

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      fullParams[key] = String(val)
    }
  }

  // Sign the request
  fullParams.api_sig = generateSignature(fullParams)
  fullParams.format = 'json'

  // POST as application/x-www-form-urlencoded
  const body = new URLSearchParams(fullParams)

  const res = await fetch(LASTFM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`Last.fm API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  if (data.error) {
    const err = new Error(
      data.message || `Last.fm error ${data.error}`,
    ) as Error & { code: number }
    err.code = data.error
    throw err
  }

  return data as T
}

// ─── Auth Helpers ────────────────────────────────────────────────────────────

/** Fetch an unauthorized request token from Last.fm. */
export async function getAuthToken(): Promise<string> {
  const apiKey = getApiKey()

  const params: Record<string, string> = {
    method: 'auth.getToken',
    api_key: apiKey,
  }
  params.api_sig = generateSignature(params)
  params.format = 'json'

  const query = new URLSearchParams(params)
  const res = await fetch(`${LASTFM_API_URL}?${query.toString()}`)
  const data = await res.json()

  if (data.error) {
    throw new Error(data.message || `Last.fm auth.getToken error ${data.error}`)
  }

  return data.token as string
}

/**
 * Build the URL the user should visit to authorize the app.
 *
 * Uses the desktop auth flow — the user approves, closes the tab/popup,
 * and the client polls `auth.getSession` until the token is authorized.
 */
export function buildAuthUrl(token: string): string {
  const apiKey = getApiKey()
  const params = new URLSearchParams({
    api_key: apiKey,
    token,
  })
  return `https://www.last.fm/api/auth/?${params.toString()}`
}

/**
 * Exchange an authorized token for a session key.
 * Returns `{ name: string; key: string }` (username and session key).
 */
export async function getSession(
  token: string,
): Promise<{ name: string; key: string }> {
  const apiKey = getApiKey()

  const params: Record<string, string> = {
    method: 'auth.getSession',
    api_key: apiKey,
    token,
  }
  params.api_sig = generateSignature(params)
  params.format = 'json'

  const query = new URLSearchParams(params)
  const res = await fetch(`${LASTFM_API_URL}?${query.toString()}`)
  const data = await res.json()

  if (data.error) {
    throw new Error(
      data.message || `Last.fm auth.getSession error ${data.error}`,
    )
  }

  return {
    name: data.session.name,
    key: data.session.key,
  }
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface LastfmImage {
  '#text': string
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega' | ''
}

export interface LastfmTag {
  name: string
  url: string
}

export interface LastfmArtistInfo {
  artist: {
    name: string
    mbid?: string
    url: string
    image?: LastfmImage[]
    stats?: {
      listeners: string
      playcount: string
    }
    similar?: {
      artist: Array<{
        name: string
        url: string
        image?: LastfmImage[]
      }>
    }
    tags?: {
      tag: LastfmTag[]
    }
    bio?: {
      published: string
      summary: string
      content: string
    }
  }
}

export interface LastfmAlbumInfo {
  album: {
    name: string
    artist: string
    mbid?: string
    url: string
    image?: LastfmImage[]
    listeners: string
    playcount: string
    tags?: {
      tag: LastfmTag[]
    }
    tracks?: {
      track:
        | Array<{
            name: string
            duration: number
            url: string
            artist: { name: string; mbid?: string; url: string }
          }>
        | {
            name: string
            duration: number
            url: string
            artist: { name: string; mbid?: string; url: string }
          }
    }
    wiki?: {
      published: string
      summary: string
      content: string
    }
  }
}

export interface LastfmTrackInfo {
  track: {
    name: string
    mbid?: string
    url: string
    duration: string
    listeners: string
    playcount: string
    artist: {
      name: string
      mbid?: string
      url: string
    }
    album?: {
      artist: string
      title: string
      mbid?: string
      url: string
      image?: LastfmImage[]
    }
    toptags?: {
      tag: LastfmTag[]
    }
    wiki?: {
      published: string
      summary: string
      content: string
    }
  }
}

export interface LastfmSimilarArtists {
  similarartists: {
    artist: Array<{
      name: string
      mbid?: string
      match: string
      url: string
      image?: LastfmImage[]
    }>
  }
}

export interface LastfmSimilarTracks {
  similartracks: {
    track: Array<{
      name: string
      playcount: number
      mbid?: string
      match: number
      url: string
      artist: { name: string; mbid?: string; url: string }
      image?: LastfmImage[]
    }>
  }
}

export interface LastfmScrobbleResponse {
  scrobbles: {
    scrobble:
      | {
          track: { corrected: string; '#text': string }
          artist: { corrected: string; '#text': string }
          album: { corrected: string; '#text': string }
          albumArtist: { corrected: string; '#text': string }
          timestamp: string
          ignoredMessage: { code: string; '#text': string }
        }
      | Array<{
          track: { corrected: string; '#text': string }
          artist: { corrected: string; '#text': string }
          album: { corrected: string; '#text': string }
          albumArtist: { corrected: string; '#text': string }
          timestamp: string
          ignoredMessage: { code: string; '#text': string }
        }>
    '@attr': { accepted: number; ignored: number }
  }
}

export interface LastfmNowPlayingResponse {
  nowplaying: {
    track: { corrected: string; '#text': string }
    artist: { corrected: string; '#text': string }
    album: { corrected: string; '#text': string }
    albumArtist: { corrected: string; '#text': string }
    ignoredMessage: { code: string; '#text': string }
  }
}
