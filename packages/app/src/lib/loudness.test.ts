import { describe, expect, it } from 'vitest'
import {
  getNormalizationGain,
  measureIntegratedLoudness,
  MIN_NORMALIZATION_GAIN,
} from '@/lib/loudness'

function sine(
  seconds: number,
  sampleRate: number,
  amplitude = 1,
  frequency = 997,
): Float32Array {
  const samples = new Float32Array(Math.round(seconds * sampleRate))
  for (let i = 0; i < samples.length; i++) {
    samples[i] =
      amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate)
  }
  return samples
}

describe('measureIntegratedLoudness', () => {
  // BS.1770: a 0 dBFS 997 Hz sine in one channel reads -3.01 LUFS.
  it.each([48000, 44100])(
    'reads a full-scale mono sine as -3.01 LUFS at %i Hz',
    (sampleRate) => {
      const loudness = measureIntegratedLoudness(
        [sine(5, sampleRate)],
        sampleRate,
      )
      expect(loudness).toBeCloseTo(-3.01, 1)
    },
  )

  it('sums channel power, so identical stereo channels read 3 dB louder', () => {
    const channel = sine(5, 48000)
    expect(measureIntegratedLoudness([channel, channel], 48000)).toBeCloseTo(
      0,
      1,
    )
  })

  it('tracks signal level in dB', () => {
    const loudness = measureIntegratedLoudness([sine(5, 48000, 0.1)], 48000)
    expect(loudness).toBeCloseTo(-23.01, 1)
  })

  it('gates out silence instead of averaging it in', () => {
    const tone = sine(5, 48000, 0.5)
    const withSilence = new Float32Array(tone.length * 2)
    withSilence.set(tone)

    // Averaging the silence in would read ~3 dB quieter; only the blocks
    // straddling the edge may pull the gated reading down slightly.
    const difference =
      measureIntegratedLoudness([tone], 48000) -
      measureIntegratedLoudness([withSilence], 48000)
    expect(difference).toBeGreaterThanOrEqual(0)
    expect(difference).toBeLessThan(0.25)
  })

  it('returns -Infinity for silence and clips shorter than one block', () => {
    expect(measureIntegratedLoudness([new Float32Array(48000)], 48000)).toBe(
      -Infinity,
    )
    expect(measureIntegratedLoudness([sine(0.3, 48000)], 48000)).toBe(-Infinity)
    expect(measureIntegratedLoudness([], 48000)).toBe(-Infinity)
  })
})

describe('getNormalizationGain', () => {
  it('turns loud tracks down to the target', () => {
    // -10 LUFS -> -16 LUFS is -6 dB.
    expect(getNormalizationGain(-10, -16)).toBeCloseTo(0.501, 3)
  })

  it('never boosts tracks quieter than the target', () => {
    expect(getNormalizationGain(-22, -16)).toBe(1)
  })

  it('leaves unmeasurable tracks alone', () => {
    expect(getNormalizationGain(-Infinity, -16)).toBe(1)
    expect(getNormalizationGain(Number.NaN, -16)).toBe(1)
  })

  it('caps the attenuation', () => {
    expect(getNormalizationGain(20, -16)).toBe(MIN_NORMALIZATION_GAIN)
  })
})
