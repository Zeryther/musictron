import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { exportPKCS8, generateKeyPair } from 'jose'
import { invalidateCache } from '@web/lib/musickit-token'
import { apiJson, apiRequest } from '@web/lib/__test-helpers__/elysia'

let pem: string

beforeAll(async () => {
  const keyPair = await generateKeyPair('ES256', { extractable: true })
  pem = await exportPKCS8(keyPair.privateKey)
})

beforeEach(() => {
  invalidateCache()
})

afterEach(() => {
  invalidateCache()
})

describe('GET /api/health', () => {
  it('returns ok with configuration flags', async () => {
    const { status, body } = await apiJson<{
      status: string
      configured: boolean
      lastfmConfigured: boolean
    }>('/api/health')

    expect(status).toBe(200)
    expect(body.status).toBe('ok')
    expect(typeof body.configured).toBe('boolean')
    expect(typeof body.lastfmConfigured).toBe('boolean')
  })
})

describe('GET /api/config', () => {
  it('returns public client config', async () => {
    const { status, body } = await apiJson<{
      name: string
      configured: boolean
    }>('/api/config')

    expect(status).toBe(200)
    expect(body.name).toBe('Musictron')
    expect(typeof body.configured).toBe('boolean')
  })
})

describe('GET /api/token', () => {
  it('returns 503 when MusicKit is not configured', async () => {
    vi.stubEnv('MUSICKIT_KEY_ID', '')
    vi.stubEnv('MUSICKIT_TEAM_ID', '')
    vi.stubEnv('MUSICKIT_PRIVATE_KEY', '')

    const { status } = await apiJson('/api/token')
    expect(status).toBe(503)
  })

  it('returns a developer token when configured', async () => {
    vi.stubEnv('MUSICKIT_KEY_ID', 'KID1234567')
    vi.stubEnv('MUSICKIT_TEAM_ID', 'TEAM123456')
    vi.stubEnv('MUSICKIT_PRIVATE_KEY', pem)

    const { status, body } = await apiJson<{
      token: string
      expiresAt: number
    }>('/api/token')

    expect(status).toBe(200)
    expect(typeof body.token).toBe('string')
    expect(body.token.split('.')).toHaveLength(3)
    expect(typeof body.expiresAt).toBe('number')
  })
})

describe('CORS', () => {
  it('answers preflight requests with the allowed methods', async () => {
    const res = await apiRequest('/api/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'GET',
      },
    })

    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('access-control-allow-methods') ?? '').toContain(
      'GET',
    )
  })
})
