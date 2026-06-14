import { SignJWT } from 'jose'
import crypto from 'node:crypto'

// Cache the imported key so we don't re-parse it on every request
let cachedKey: crypto.KeyObject | null = null
let cachedToken: { jwt: string; expiresAt: number } | null = null

function getEnvOrThrow(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Read the .p8 private key from the environment.
 *
 * The key can be provided as:
 *   - MUSICKIT_PRIVATE_KEY: the raw PEM string (with literal \n or actual newlines)
 *   - MUSICKIT_PRIVATE_KEY_PATH: path to the .p8 file on disk
 */
async function getPrivateKey(): Promise<crypto.KeyObject> {
  if (cachedKey) return cachedKey

  let pem: string

  if (process.env.MUSICKIT_PRIVATE_KEY) {
    // Support escaped newlines from environment variables (e.g. Docker, Vercel)
    pem = process.env.MUSICKIT_PRIVATE_KEY.replace(/\\n/g, '\n')
  } else if (process.env.MUSICKIT_PRIVATE_KEY_PATH) {
    const fs = await import('node:fs/promises')
    pem = await fs.readFile(process.env.MUSICKIT_PRIVATE_KEY_PATH, 'utf-8')
  } else {
    throw new Error(
      'Either MUSICKIT_PRIVATE_KEY or MUSICKIT_PRIVATE_KEY_PATH must be set',
    )
  }

  cachedKey = crypto.createPrivateKey(pem)
  return cachedKey
}

/** MusicKit JS playback has been reliable with short developer-token lifetimes. */
const PLAYBACK_MAX_TTL_SECONDS = 3600
/** Default lifetime when MUSICKIT_TOKEN_TTL_SECONDS is unset. */
const DEFAULT_TTL_SECONDS = 3600
/** Re-mint cached tokens before clients enter their refresh window. */
const TOKEN_CACHE_REFRESH_BUFFER_SECONDS = 15 * 60

/**
 * Resolve the developer-token lifetime (seconds) from the environment.
 *
 * Defaults to the previous known-good 1 hour lifetime. Long-lived tokens are
 * allowed by the API docs, but MusicKit JS playback has proven more reliable
 * with short-lived tokens that the client rotates before expiry, so overrides
 * are capped at 1 hour.
 */
function resolveTtlSeconds(value?: number): number {
  const parsed =
    value ?? Number.parseInt(process.env.MUSICKIT_TOKEN_TTL_SECONDS ?? '', 10)
  const ttl =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS
  return Math.min(Math.max(ttl, 60), PLAYBACK_MAX_TTL_SECONDS)
}

export interface TokenConfig {
  /** MusicKit Key ID (10-character identifier from Apple Developer portal) */
  keyId: string
  /** Apple Developer Team ID */
  teamId: string
  /**
   * Token lifetime in seconds. Defaults to MUSICKIT_TOKEN_TTL_SECONDS, or 3600
   * when unset. Values above 3600 are capped for MusicKit JS playback.
   */
  expiresInSeconds?: number
}

/**
 * Generate a MusicKit developer token (ES256-signed JWT).
 *
 * The token structure follows Apple's specification:
 * - Header: { alg: "ES256", kid: "<KeyID>" }
 * - Payload: { iss: "<TeamID>", iat: <now>, exp: <now + ttl> }
 */
export async function generateDeveloperToken(
  config?: Partial<TokenConfig>,
): Promise<{ token: string; expiresAt: number }> {
  const keyId = config?.keyId ?? getEnvOrThrow('MUSICKIT_KEY_ID')
  const teamId = config?.teamId ?? getEnvOrThrow('MUSICKIT_TEAM_ID')
  const expiresInSeconds = resolveTtlSeconds(config?.expiresInSeconds)
  const cacheRefreshBuffer = Math.min(
    TOKEN_CACHE_REFRESH_BUFFER_SECONDS,
    Math.max(60, Math.floor(expiresInSeconds / 2)),
  )

  // Return cached token unless it is already close enough to expiry that the
  // client needs a new token for proactive in-playback rotation.
  if (
    cachedToken &&
    cachedToken.expiresAt > Date.now() / 1000 + cacheRefreshBuffer
  ) {
    return { token: cachedToken.jwt, expiresAt: cachedToken.expiresAt }
  }

  const privateKey = await getPrivateKey()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + expiresInSeconds

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey)

  cachedToken = { jwt, expiresAt: exp }
  return { token: jwt, expiresAt: exp }
}

/**
 * Invalidate the cached key and token.
 * Useful if the key is rotated at runtime.
 */
export function invalidateCache(): void {
  cachedKey = null
  cachedToken = null
}

/**
 * Check whether the server has the required MusicKit credentials configured.
 */
export function isConfigured(): boolean {
  try {
    getEnvOrThrow('MUSICKIT_KEY_ID')
    getEnvOrThrow('MUSICKIT_TEAM_ID')
    // Check that at least one key source exists
    if (
      !process.env.MUSICKIT_PRIVATE_KEY &&
      !process.env.MUSICKIT_PRIVATE_KEY_PATH
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}
