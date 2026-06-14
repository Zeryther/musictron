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

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  const first = trimmed.at(0)
  const last = trimmed.at(-1)

  if (
    first &&
    first === last &&
    (first === '"' || first === "'" || first === '`')
  ) {
    if (first === '"') {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        if (typeof parsed === 'string') {
          return parsed.trim()
        }
      } catch {
        // Fall back to trimming the wrapping quotes below.
      }
    }

    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function wrapPkcs8PrivateKey(base64Body: string): string {
  const lines = base64Body.match(/.{1,64}/g) ?? []

  return [
    '-----BEGIN PRIVATE KEY-----',
    ...lines,
    '-----END PRIVATE KEY-----',
  ].join('\n')
}

function normalizePrivateKey(input: string): string {
  const normalized = stripWrappingQuotes(input)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  if (normalized.includes('-----BEGIN PRIVATE KEY-----')) {
    return normalized
  }

  const compact = normalized.replace(/\s/g, '')
  if (/^[A-Za-z0-9+/=]+$/.test(compact)) {
    const decoded = Buffer.from(compact, 'base64').toString('utf-8').trim()

    if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
      return decoded
    }

    return wrapPkcs8PrivateKey(compact)
  }

  return normalized
}

/**
 * Read the .p8 private key from the environment.
 *
 * The key can be provided as:
 *   - MUSICKIT_PRIVATE_KEY: the raw PEM string (with literal \n or actual newlines)
 *   - MUSICKIT_PRIVATE_KEY: base64-encoded PEM, or the base64 body from the .p8
 *   - MUSICKIT_PRIVATE_KEY_PATH: path to the .p8 file on disk
 */
async function getPrivateKey(): Promise<crypto.KeyObject> {
  if (cachedKey) return cachedKey

  let pem: string

  if (process.env.MUSICKIT_PRIVATE_KEY) {
    // Support common secret formats from hosts like Docker and Vercel:
    // raw PEM, escaped-newline PEM, base64-encoded PEM, or .p8 base64 body.
    pem = normalizePrivateKey(process.env.MUSICKIT_PRIVATE_KEY)
  } else if (process.env.MUSICKIT_PRIVATE_KEY_PATH) {
    const fs = await import('node:fs/promises')
    pem = normalizePrivateKey(
      await fs.readFile(process.env.MUSICKIT_PRIVATE_KEY_PATH, 'utf-8'),
    )
  } else {
    throw new Error(
      'Either MUSICKIT_PRIVATE_KEY or MUSICKIT_PRIVATE_KEY_PATH must be set',
    )
  }

  try {
    cachedKey = crypto.createPrivateKey(pem)
  } catch (cause) {
    throw new Error(
      'Invalid MUSICKIT_PRIVATE_KEY. Expected an Apple MusicKit .p8 PKCS#8 private key as PEM, escaped-newline PEM, base64-encoded PEM, or the .p8 base64 body.',
      { cause },
    )
  }
  return cachedKey
}

/** Apple's documented maximum developer-token lifetime: ~6 months. */
const APPLE_MAX_TTL_SECONDS = 15777000
/**
 * Default lifetime when MUSICKIT_TOKEN_TTL_SECONDS is unset: Apple's max.
 *
 * A long-lived token outlives any realistic listening session, so MusicKit JS
 * never hits an expired developer token mid-playback. Short-lived (1h) tokens
 * were tried previously but caused recurring MEDIA_LICENSE interruptions:
 * MusicKit captures the developer token at configure() time for its DRM/license
 * pipeline, and the client's in-place token rotation never reaches that
 * pipeline — so the player kept using the original (now-expired) token and the
 * next license fetch was rejected.
 */
const DEFAULT_TTL_SECONDS = APPLE_MAX_TTL_SECONDS
/** Re-mint cached tokens before clients enter their refresh window. */
const TOKEN_CACHE_REFRESH_BUFFER_SECONDS = 15 * 60

/**
 * Resolve the developer-token lifetime (seconds) from the environment.
 *
 * Defaults to Apple's documented maximum (~6 months). A long lifetime keeps the
 * token valid for the entire session so MusicKit JS playback never hits an
 * expired developer token. Overrides are clamped to a 60s floor and Apple's max.
 */
function resolveTtlSeconds(value?: number): number {
  const parsed =
    value ?? Number.parseInt(process.env.MUSICKIT_TOKEN_TTL_SECONDS ?? '', 10)
  const ttl =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS
  return Math.min(Math.max(ttl, 60), APPLE_MAX_TTL_SECONDS)
}

export interface TokenConfig {
  /** MusicKit Key ID (10-character identifier from Apple Developer portal) */
  keyId: string
  /** Apple Developer Team ID */
  teamId: string
  /**
   * Token lifetime in seconds. Defaults to MUSICKIT_TOKEN_TTL_SECONDS, or
   * 15777000 (~6 months) when unset. Max allowed by Apple: 15777000.
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
