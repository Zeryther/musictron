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
