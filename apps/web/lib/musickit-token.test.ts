import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  decodeJwt,
  decodeProtectedHeader,
  exportPKCS8,
  generateKeyPair,
  jwtVerify,
} from 'jose'
import {
  generateDeveloperToken,
  invalidateCache,
  isConfigured,
  resolveTtlSeconds,
} from '@web/lib/musickit-token'

let keyPair: Awaited<ReturnType<typeof generateKeyPair>>
let pem: string

beforeAll(async () => {
  keyPair = await generateKeyPair('ES256', { extractable: true })
  pem = await exportPKCS8(keyPair.privateKey)
})

beforeEach(() => {
  invalidateCache()
  vi.stubEnv('MUSICKIT_KEY_ID', 'KID1234567')
  vi.stubEnv('MUSICKIT_TEAM_ID', 'TEAM123456')
  vi.stubEnv('MUSICKIT_PRIVATE_KEY', pem)
})

afterEach(() => {
  invalidateCache()
})

describe('resolveTtlSeconds', () => {
  it('caps at 3600 seconds', () => {
    expect(resolveTtlSeconds(99999)).toBe(3600)
  })

  it('floors at 60 seconds', () => {
    expect(resolveTtlSeconds(30)).toBe(60)
  })

  it('passes values within range through', () => {
    expect(resolveTtlSeconds(1800)).toBe(1800)
  })

  it('reads MUSICKIT_TOKEN_TTL_SECONDS when no value is given', () => {
    vi.stubEnv('MUSICKIT_TOKEN_TTL_SECONDS', '120')
    expect(resolveTtlSeconds()).toBe(120)
  })

  it('defaults to 3600 when unset', () => {
    expect(resolveTtlSeconds()).toBe(3600)
  })
})

describe('isConfigured', () => {
  it('is true when key id, team id, and a private key are present', () => {
    expect(isConfigured()).toBe(true)
  })

  it('is false when the key id is missing', () => {
    vi.stubEnv('MUSICKIT_KEY_ID', '')
    expect(isConfigured()).toBe(false)
  })

  it('is false when no private key source is present', () => {
    vi.stubEnv('MUSICKIT_PRIVATE_KEY', '')
    expect(isConfigured()).toBe(false)
  })
})

describe('generateDeveloperToken', () => {
  it('signs an ES256 JWT with the expected header and claims', async () => {
    const { token, expiresAt } = await generateDeveloperToken()

    const header = decodeProtectedHeader(token)
    expect(header.alg).toBe('ES256')
    expect(header.kid).toBe('KID1234567')

    const payload = decodeJwt(token)
    expect(payload.iss).toBe('TEAM123456')
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBeLessThanOrEqual(3600)
    expect(expiresAt).toBe(payload.exp)

    // Signature verifies against the matching public key.
    await expect(jwtVerify(token, keyPair.publicKey)).resolves.toBeTruthy()
  })

  it('caps an over-long TTL at 3600 seconds', async () => {
    const { token } = await generateDeveloperToken({ expiresInSeconds: 99999 })
    const payload = decodeJwt(token)
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(3600)
  })

  it('returns the cached token until invalidated', async () => {
    const first = await generateDeveloperToken()
    const second = await generateDeveloperToken()
    expect(second.token).toBe(first.token)

    invalidateCache()
    const third = await generateDeveloperToken()
    expect(third.token).not.toBe(first.token)
  })

  it('accepts a base64-encoded PEM private key', async () => {
    vi.stubEnv('MUSICKIT_PRIVATE_KEY', Buffer.from(pem).toString('base64'))
    invalidateCache()

    const { token } = await generateDeveloperToken()
    await expect(jwtVerify(token, keyPair.publicKey)).resolves.toBeTruthy()
  })
})
