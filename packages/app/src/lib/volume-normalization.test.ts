import { beforeEach, describe, expect, it, vi } from 'vitest'
import { musicAPI } from '@/lib/musickit'
import {
  getCatalogSongId,
  getTrackLoudness,
  normalizeNowPlaying,
} from '@/lib/volume-normalization'
import { useVolumeNormalizationStore } from '@/stores/volume-normalization-store'
import { autoResetStores } from '@/test/store'

vi.mock('@/lib/musickit', () => ({
  musicAPI: vi.fn(),
  logMusicKitDebug: vi.fn(),
}))

autoResetStores(useVolumeNormalizationStore)

const store = () => useVolumeNormalizationStore.getState()

function song(
  id: string,
  attributes: Partial<MusicKit.MediaItem['attributes']> = {},
): MusicKit.MediaItem {
  return { id, type: 'songs', attributes } as MusicKit.MediaItem
}

/** A decoded clip: one channel of a 997 Hz sine at `amplitude`. */
function stubDecoder(amplitude: number) {
  const sampleRate = 44100
  const samples = new Float32Array(sampleRate * 2)
  for (let i = 0; i < samples.length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * 997 * i) / sampleRate)
  }
  vi.stubGlobal(
    'OfflineAudioContext',
    class {
      async decodeAudioData() {
        return {
          numberOfChannels: 1,
          sampleRate,
          getChannelData: () => samples,
        }
      }
    },
  )
  const fetchMock = vi.fn(async () => new Response(new ArrayBuffer(8)))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.mocked(musicAPI).mockReset()
})

describe('getCatalogSongId', () => {
  it('uses the catalog id for library songs and the id for catalog songs', () => {
    expect(
      getCatalogSongId(
        song('i.abc', {
          playParams: { id: 'i.abc', kind: 'song', catalogId: '7' },
        }),
      ),
    ).toBe('7')
    expect(getCatalogSongId(song('1499378615'))).toBe('1499378615')
    expect(getCatalogSongId(song('i.uploaded'))).toBeNull()
  })
})

describe('getCatalogSongId for non-song items', () => {
  it('skips music videos and stations', () => {
    expect(
      getCatalogSongId(
        song('1500000000', {
          playParams: { id: '1500000000', kind: 'musicVideo' },
        }),
      ),
    ).toBeNull()
    expect(
      getCatalogSongId({ ...song('1500000001'), type: 'music-videos' }),
    ).toBeNull()
    expect(
      getCatalogSongId({ ...song('1500000002'), type: 'stations' }),
    ).toBeNull()
  })
})

describe('getTrackLoudness', () => {
  it('measures the preview and caches the result', async () => {
    const fetchMock = stubDecoder(1)
    const item = song('100', { previews: [{ url: 'https://preview/100.m4a' }] })

    const lufs = await getTrackLoudness(item)

    expect(lufs).toBeCloseTo(-3.01, 1)
    expect(fetchMock).toHaveBeenCalledWith('https://preview/100.m4a')
    expect(store().loudnessCache['100']?.lufs).toBeCloseTo(-3.01, 1)

    // Served from cache the second time.
    await getTrackLoudness(item)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('looks up the catalog preview for library songs', async () => {
    const fetchMock = stubDecoder(1)
    vi.mocked(musicAPI).mockResolvedValue({
      data: [
        {
          id: '200',
          type: 'songs',
          attributes: { previews: [{ url: 'https://preview/200.m4a' }] },
        },
      ],
    })

    await getTrackLoudness(
      song('i.lib', {
        playParams: { id: 'i.lib', kind: 'song', catalogId: '200' },
      }),
    )

    expect(musicAPI).toHaveBeenCalledWith(
      '/v1/catalog/{{storefrontId}}/songs/200',
      { 'fields[songs]': 'previews' },
    )
    expect(fetchMock).toHaveBeenCalledWith('https://preview/200.m4a')
  })

  it('retries after a transient failure but not after a definitive one', async () => {
    const fetchMock = stubDecoder(1)
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    vi.mocked(musicAPI).mockRejectedValueOnce(new Error('network'))
    const transient = song('i.t1', {
      playParams: { id: 'i.t1', kind: 'song', catalogId: '800' },
    })

    expect(await getTrackLoudness(transient)).toBeNull()
    expect(await getTrackLoudness(transient)).toBeNull() // backing off
    expect(musicAPI).toHaveBeenCalledTimes(1)

    now.mockReturnValue(1_000_000 + 61_000)
    vi.mocked(musicAPI).mockResolvedValue({
      data: [
        { id: '800', type: 'songs', attributes: { previews: [{ url: 'u' }] } },
      ],
    })
    expect(await getTrackLoudness(transient)).toBeCloseTo(-3.01, 1)

    // A track whose preview doesn't decode is not retried.
    vi.stubGlobal(
      'OfflineAudioContext',
      class {
        async decodeAudioData() {
          throw new Error('EncodingError')
        }
      },
    )
    const broken = song('801', { previews: [{ url: 'https://p/801' }] })
    expect(await getTrackLoudness(broken)).toBeNull()
    now.mockReturnValue(1_000_000 + 10 * 60_000)
    expect(await getTrackLoudness(broken)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2) // 800 once, 801 once
  })

  it('resolves to null when the track has no preview', async () => {
    const fetchMock = stubDecoder(1)
    vi.mocked(musicAPI).mockResolvedValue({ data: [] })

    expect(await getTrackLoudness(song('300'))).toBeNull()
    expect(await getTrackLoudness(song('i.uploaded'))).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('normalizeNowPlaying', () => {
  it('uses cached loudness immediately', () => {
    store().rememberLoudness('400', -9)
    normalizeNowPlaying(song('400'))
    expect(store().track).toEqual({
      songId: '400',
      status: 'ready',
      loudness: -9,
    })
  })

  it('measures uncached tracks and prefetches the next ones', async () => {
    const fetchMock = stubDecoder(0.5)
    const preview = (id: string) => ({ previews: [{ url: `https://p/${id}` }] })

    normalizeNowPlaying(song('500', preview('500')), [
      song('501', preview('501')),
      song('502', preview('502')),
      song('503', preview('503')),
    ])
    expect(store().track).toEqual({
      songId: '500',
      status: 'pending',
      loudness: null,
    })

    await vi.waitFor(() => expect(store().track?.status).toBe('ready'))
    expect(store().track?.loudness).toBeCloseTo(-9.03, 1)

    await vi.waitFor(() => expect(store().loudnessCache['502']).toBeDefined())
    expect(store().loudnessCache['503']).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('skips queued prefetches for tracks that are no longer upcoming', async () => {
    const fetchMock = stubDecoder(0.5)
    const preview = (id: string) => ({ previews: [{ url: `https://p/${id}` }] })
    store().rememberLoudness('900', -10)
    store().rememberLoudness('910', -10)

    normalizeNowPlaying(song('900'), [
      song('901', preview('901')),
      song('902', preview('902')),
    ])
    // Skipped ahead before those prefetches ran.
    normalizeNowPlaying(song('910'), [song('911', preview('911'))])

    await vi.waitFor(() => expect(store().loudnessCache['911']).toBeDefined())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://p/911')
  })

  it('keeps queued prefetches when called without an upcoming list', async () => {
    const fetchMock = stubDecoder(0.5)
    store().rememberLoudness('920', -10)
    store().rememberLoudness('921', -10)

    normalizeNowPlaying(song('920'), [
      song('922', { previews: [{ url: 'https://p/922' }] }),
    ])
    normalizeNowPlaying(song('921')) // MusicKit's will-change event

    await vi.waitFor(() => expect(store().loudnessCache['922']).toBeDefined())
    expect(fetchMock).toHaveBeenCalledWith('https://p/922')
  })

  it('marks tracks that cannot be measured as unavailable', async () => {
    stubDecoder(1)
    vi.mocked(musicAPI).mockRejectedValue(new Error('network'))

    normalizeNowPlaying(song('600'))

    await vi.waitFor(() =>
      expect(store().track).toEqual({
        songId: '600',
        status: 'unavailable',
        loudness: null,
      }),
    )
  })

  it('does nothing while normalization is off', () => {
    store().setEnabled(false)
    normalizeNowPlaying(song('700'))
    expect(store().track).toBeNull()
  })
})
