import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isAudioProcessingActive,
  setProcessingGains,
  setStableVolumeCompression,
  startAudioProcessing,
  type AudioProcessingCallbacks,
} from '@/lib/audio-processing'
import { initializePlayerEvents, usePlayerStore } from '@/stores/player-store'
import { useVolumeNormalizationStore } from '@/stores/volume-normalization-store'
import { clearMusicKit, stubMusicKit } from '@/test/musickit'
import { autoResetStores } from '@/test/store'

vi.mock('@/lib/audio-processing', () => ({
  isAudioProcessingActive: vi.fn(() => false),
  resumeAudioProcessing: vi.fn(),
  setProcessingGains: vi.fn(),
  setStableVolumeCompression: vi.fn(),
  startAudioProcessing: vi.fn(() => true),
}))

autoResetStores(usePlayerStore, useVolumeNormalizationStore)

const normalization = () => useVolumeNormalizationStore.getState()

beforeEach(() => {
  vi.mocked(isAudioProcessingActive).mockReturnValue(false)
})

afterEach(() => {
  clearMusicKit()
})

describe('stable volume', () => {
  it('moves the volume into the audio graph while processing is active', () => {
    const { instance } = stubMusicKit()
    vi.mocked(isAudioProcessingActive).mockReturnValue(true)
    normalization().setTrack({ songId: '1', status: 'ready', loudness: -10 })

    usePlayerStore.getState().setVolume(0.6)

    expect(instance.volume).toBe(1)
    const [gain, volume] = vi.mocked(setProcessingGains).mock.lastCall ?? []
    expect(gain).toBeCloseTo(0.501, 3)
    expect(volume).toBe(0.6)
  })

  it('starts processing when turned on and bypasses it when turned off', () => {
    stubMusicKit()

    normalization().setStableVolume(true)
    expect(startAudioProcessing).toHaveBeenCalled()

    normalization().setStableVolume(false)
    expect(setStableVolumeCompression).toHaveBeenLastCalledWith(false)
  })

  it('resumes processing on startup when it was left on', () => {
    stubMusicKit()
    useVolumeNormalizationStore.setState({ stableVolume: true })
    vi.mocked(startAudioProcessing).mockClear()

    initializePlayerEvents()

    expect(startAudioProcessing).toHaveBeenCalled()
  })

  it('turns itself off and explains why when playback goes silent', () => {
    stubMusicKit()
    normalization().setStableVolume(true)
    const callbacks = vi.mocked(startAudioProcessing).mock
      .lastCall?.[0] as AudioProcessingCallbacks

    callbacks.onSilence()

    expect(normalization().stableVolume).toBe(false)
    expect(normalization().stableVolumeFailed).toBe(true)
    expect(usePlayerStore.getState().playbackError?.title).toBe(
      'Stable volume is not supported here',
    )

    // Stays off until reload.
    normalization().setStableVolume(true)
    expect(normalization().stableVolume).toBe(false)
  })
})
