import { describe, expect, it } from 'vitest'
import { decodeJwtPayload, getChartData } from '@/lib/musickit'
import { makeSong } from '@/test/factories'

describe('getChartData', () => {
  it('returns [] for undefined', () => {
    expect(getChartData(undefined)).toEqual([])
  })

  it('extracts the first chart group data when given an array', () => {
    const song = makeSong()
    const groups: MusicKit.ChartGroup[] = [
      { data: [song] },
      { data: [makeSong()] },
    ]
    expect(getChartData(groups)).toEqual([song])
  })

  it('returns data directly for a SearchResultList', () => {
    const song = makeSong()
    const list: MusicKit.SearchResultList = { data: [song] }
    expect(getChartData(list)).toEqual([song])
  })

  it('returns [] for an empty chart-group array', () => {
    expect(getChartData([])).toEqual([])
  })
})

describe('decodeJwtPayload', () => {
  it('returns null for undefined', () => {
    expect(decodeJwtPayload(undefined)).toBeNull()
  })

  it('decodes the payload segment of a JWT', () => {
    const payload = { iat: 100, exp: 200, origin: ['https://example.com'] }
    const segment = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const token = `header.${segment}.signature`
    expect(decodeJwtPayload(token)).toEqual(payload)
  })

  it('returns null for a malformed token', () => {
    expect(decodeJwtPayload('only-one-segment')).toBeNull()
    expect(decodeJwtPayload('a.@@@notbase64@@@.c')).toBeNull()
  })
})
