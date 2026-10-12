import { describe, expect, it, vi } from 'vitest'
import {
  ASSUMED_TRACK_LOUDNESS,
  selectEffectiveLoudness,
  selectNormalizationGain,
  useVolumeNormalizationStore,
} from '@/stores/volume-normalization-store'
import { autoResetStores } from '@/test/store'

autoResetStores(useVolumeNormalizationStore)

const store = () => useVolumeNormalizationStore.getState()

describe('selectNormalizationGain', () => {
  it('is 1 when normalization is off', () => {
    store().setTrack({ songId: '1', status: 'ready', loudness: -6 })
    store().setEnabled(false)
    expect(selectNormalizationGain(store())).toBe(1)
  })

  it('turns a measured track down to the selected level', () => {
    store().setTrack({ songId: '1', status: 'ready', loudness: -10 })
    expect(selectNormalizationGain(store())).toBeCloseTo(0.501, 3) // -6 dB

    store().setLevel('loud')
    expect(selectNormalizationGain(store())).toBeCloseTo(0.794, 3) // -2 dB

    store().setLevel('quiet')
    expect(selectNormalizationGain(store())).toBeCloseTo(0.316, 3) // -10 dB
  })
})

describe('selectEffectiveLoudness', () => {
  it('holds the previous track while the next one is measured', () => {
    store().setTrack({ songId: '1', status: 'ready', loudness: -8 })
    store().setTrack({ songId: '2', status: 'pending', loudness: null })
    expect(selectEffectiveLoudness(store())).toBe(-8)
  })

  it('assumes a typical level when nothing has been measured', () => {
    store().setTrack({ songId: '1', status: 'pending', loudness: null })
    expect(selectEffectiveLoudness(store())).toBe(ASSUMED_TRACK_LOUDNESS)

    store().setTrack({ songId: '1', status: 'unavailable', loudness: null })
    expect(selectEffectiveLoudness(store())).toBe(ASSUMED_TRACK_LOUDNESS)
  })

  it('falls back to a typical level for unmeasurable tracks, not the previous one', () => {
    store().setTrack({ songId: '1', status: 'ready', loudness: -20 })
    store().setTrack({ songId: '2', status: 'unavailable', loudness: null })
    expect(selectEffectiveLoudness(store())).toBe(ASSUMED_TRACK_LOUDNESS)
  })
})

describe('useVolumeNormalizationStore.rememberLoudness', () => {
  it('keeps only the most recently measured tracks', () => {
    const now = vi.spyOn(Date, 'now')
    for (let i = 0; i < 1001; i++) {
      now.mockReturnValue(i)
      store().rememberLoudness(String(i), -10)
    }

    const cache = store().loudnessCache
    expect(Object.keys(cache)).toHaveLength(1000)
    expect(cache['0']).toBeUndefined()
    expect(cache['1000']).toEqual({ lufs: -10, measuredAt: 1000 })
  })

  it('persists settings and measurements but not the playing track', () => {
    store().setLevel('quiet')
    store().rememberLoudness('42', -9)
    store().setTrack({ songId: '42', status: 'ready', loudness: -9 })

    const { partialize } = useVolumeNormalizationStore.persist.getOptions()
    expect(partialize?.(store())).toEqual({
      enabled: true,
      level: 'quiet',
      loudnessCache: { '42': { lufs: -9, measuredAt: expect.any(Number) } },
    })
  })
})
