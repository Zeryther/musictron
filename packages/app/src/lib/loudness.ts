// Loudness measurement (ITU-R BS.1770-4 / EBU R128) and normalization math.
//
// Pure functions only — no Web Audio, no MusicKit — so they run in unit tests.

/** Lowest gain normalization will apply (-20 dB), guarding against bad data. */
export const MIN_NORMALIZATION_GAIN = 0.1

const BLOCK_SECONDS = 0.4
const STEP_SECONDS = 0.1 // 75% overlap between 400 ms gating blocks
const ABSOLUTE_GATE_LUFS = -70
const RELATIVE_GATE_LU = -10

interface Biquad {
  b0: number
  b1: number
  b2: number
  a1: number
  a2: number
}

/**
 * The two-stage K-weighting filter from BS.1770, with coefficients derived
 * for any sample rate (the spec only tabulates 48 kHz).
 */
function kWeightingFilters(sampleRate: number): [Biquad, Biquad] {
  // Stage 1: high-shelf modelling the acoustic effect of the head.
  const shelfF0 = 1681.974450955533
  const shelfGainDb = 3.999843853973347
  const shelfQ = 0.7071752369554196
  const k1 = Math.tan((Math.PI * shelfF0) / sampleRate)
  const vh = 10 ** (shelfGainDb / 20)
  const vb = vh ** 0.4996667741545416
  const shelfA0 = 1 + k1 / shelfQ + k1 * k1
  const shelf: Biquad = {
    b0: (vh + (vb * k1) / shelfQ + k1 * k1) / shelfA0,
    b1: (2 * (k1 * k1 - vh)) / shelfA0,
    b2: (vh - (vb * k1) / shelfQ + k1 * k1) / shelfA0,
    a1: (2 * (k1 * k1 - 1)) / shelfA0,
    a2: (1 - k1 / shelfQ + k1 * k1) / shelfA0,
  }

  // Stage 2: RLB high-pass that discounts low frequencies.
  const passF0 = 38.13547087602444
  const passQ = 0.5003270373238773
  const k2 = Math.tan((Math.PI * passF0) / sampleRate)
  const passA0 = 1 + k2 / passQ + k2 * k2
  const highPass: Biquad = {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (k2 * k2 - 1)) / passA0,
    a2: (1 - k2 / passQ + k2 * k2) / passA0,
  }

  return [shelf, highPass]
}

/**
 * K-weight one channel and return the sum of squared samples for each
 * consecutive `stepSize`-sample segment.
 */
function weightedSegmentEnergy(
  samples: Float32Array,
  filters: [Biquad, Biquad],
  stepSize: number,
  segmentCount: number,
): Float64Array {
  const [f1, f2] = filters
  const energy = new Float64Array(segmentCount)
  // Direct form I state for both stages.
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  let z1 = 0
  let z2 = 0

  for (let segment = 0; segment < segmentCount; segment++) {
    let sum = 0
    const end = (segment + 1) * stepSize
    for (let i = segment * stepSize; i < end; i++) {
      const x = samples[i] ?? 0
      const y = f1.b0 * x + f1.b1 * x1 + f1.b2 * x2 - f1.a1 * y1 - f1.a2 * y2
      x2 = x1
      x1 = x
      const z = f2.b0 * y + f2.b1 * y1 + f2.b2 * y2 - f2.a1 * z1 - f2.a2 * z2
      y2 = y1
      y1 = y
      z2 = z1
      z1 = z
      sum += z * z
    }
    energy[segment] = sum
  }

  return energy
}

function energyToLufs(meanSquare: number): number {
  return meanSquare > 0 ? -0.691 + 10 * Math.log10(meanSquare) : -Infinity
}

/**
 * Gated integrated loudness of a clip, in LUFS. Every channel is weighted
 * equally, which matches BS.1770 for mono and stereo material.
 *
 * Returns `-Infinity` for silence or clips shorter than one 400 ms block.
 */
export function measureIntegratedLoudness(
  channels: Float32Array[],
  sampleRate: number,
): number {
  if (channels.length === 0 || sampleRate <= 0) return -Infinity

  const stepSize = Math.round(sampleRate * STEP_SECONDS)
  const stepsPerBlock = Math.round(BLOCK_SECONDS / STEP_SECONDS)
  const sampleCount = Math.min(...channels.map((c) => c.length))
  const segmentCount = Math.floor(sampleCount / stepSize)
  const blockCount = segmentCount - stepsPerBlock + 1
  if (blockCount < 1) return -Infinity

  const filters = kWeightingFilters(sampleRate)
  const segments = channels.map((channel) =>
    weightedSegmentEnergy(channel, filters, stepSize, segmentCount),
  )

  // Per-block loudness power: mean square per channel, summed over channels.
  const blockSize = stepSize * stepsPerBlock
  const blockPower = new Float64Array(blockCount)
  for (let block = 0; block < blockCount; block++) {
    let power = 0
    for (const channel of segments) {
      let sum = 0
      for (let s = 0; s < stepsPerBlock; s++) sum += channel[block + s] ?? 0
      power += sum / blockSize
    }
    blockPower[block] = power
  }

  const gatedMean = (threshold: number) => {
    let sum = 0
    let count = 0
    for (const power of blockPower) {
      if (energyToLufs(power) > threshold) {
        sum += power
        count++
      }
    }
    return count > 0 ? sum / count : 0
  }

  const absoluteGated = gatedMean(ABSOLUTE_GATE_LUFS)
  if (absoluteGated <= 0) return -Infinity
  const relativeGate = energyToLufs(absoluteGated) + RELATIVE_GATE_LU
  return energyToLufs(gatedMean(Math.max(relativeGate, ABSOLUTE_GATE_LUFS)))
}

/**
 * Volume multiplier that brings a track measured at `loudness` LUFS down to
 * `targetLufs`. Never boosts (that would clip, and the media element volume
 * caps at 1), so tracks already quieter than the target play unchanged.
 */
export function getNormalizationGain(
  loudness: number,
  targetLufs: number,
): number {
  if (!Number.isFinite(loudness) || !Number.isFinite(targetLufs)) return 1
  const gain = 10 ** ((targetLufs - loudness) / 20)
  return Math.min(1, Math.max(MIN_NORMALIZATION_GAIN, gain))
}
