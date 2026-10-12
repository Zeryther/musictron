// Experimental "stable volume": route MusicKit's <audio> elements through Web
// Audio and compress the loud and quiet moments within a song, like YouTube's
// Stable Volume.
//
// Browsers may refuse to expose DRM-protected (EME) audio to Web Audio and
// output silence instead, and cross-origin audio without CORS (e.g. previews)
// is silenced the same way. An element can't be un-routed from an
// AudioContext, so a watchdog detects that silence, turns the feature off and
// the user has to reload to get sound back.

/** Id MusicKit gives every <audio> element it plays through. */
const MUSICKIT_AUDIO_ID = 'apple-music-player'

/**
 * Tuned in Chromium against real masters: a 21 dB jump between a quiet and a
 * loud passage shrinks to ~10 dB, while passages already normalized to
 * -16 LUFS keep their loudness (the node applies its own makeup gain), and
 * peaks stay below -2 dBFS.
 */
export const STABLE_VOLUME_COMPRESSOR = {
  threshold: -30,
  knee: 10,
  ratio: 4,
  attack: 0.01,
  release: 0.3,
}

/** Time constants for gain changes: track changes vs. volume slider moves. */
const GAIN_FADE_SECONDS = 0.1
const GAIN_SMOOTHING_SECONDS = 0.015

const SILENCE_CHECK_MS = 500
/** Continuous digital silence during playback before giving up. */
export const SILENCE_LIMIT_MS = 8000

export interface ProcessingChain {
  /** Normalization gain, applied before compression. */
  input: GainNode
  /** Taps the signal before the volume so silence can be detected. */
  analyser: AnalyserNode
  compressor: DynamicsCompressorNode
  /** The user's volume. */
  output: GainNode
  setCompressionEnabled: (enabled: boolean) => void
}

/** input → analyser → [compressor] → output → destination */
export function createProcessingChain(
  context: BaseAudioContext,
): ProcessingChain {
  const input = context.createGain()
  const analyser = context.createAnalyser()
  analyser.fftSize = 2048
  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = STABLE_VOLUME_COMPRESSOR.threshold
  compressor.knee.value = STABLE_VOLUME_COMPRESSOR.knee
  compressor.ratio.value = STABLE_VOLUME_COMPRESSOR.ratio
  compressor.attack.value = STABLE_VOLUME_COMPRESSOR.attack
  compressor.release.value = STABLE_VOLUME_COMPRESSOR.release
  const output = context.createGain()

  input.connect(analyser)
  compressor.connect(output)
  output.connect(context.destination)

  let compressing: boolean | null = null
  return {
    input,
    analyser,
    compressor,
    output,
    setCompressionEnabled: (enabled) => {
      if (enabled === compressing) return
      analyser.disconnect()
      analyser.connect(enabled ? compressor : output)
      compressing = enabled
    },
  }
}

export interface SilenceSample {
  /** The element is playing and its playback position moved. */
  advancing: boolean
  /** The element isn't muted or at zero volume. */
  audible: boolean
  /** Every sample in the analyser window is exactly zero. */
  silent: boolean
}

/** How long playback has been digitally silent after this check, in ms. */
export function nextSilentDuration(
  previousMs: number,
  sample: SilenceSample,
  elapsedMs: number,
): number {
  return sample.advancing && sample.audible && sample.silent
    ? previousMs + elapsedMs
    : 0
}

export interface AudioProcessingCallbacks {
  /** Whether MusicKit's audio runs through the graph changed. */
  onActiveChange: () => void
  /** Processing produced silence; the feature can't work in this browser. */
  onSilence: () => void
}

let context: AudioContext | null = null
let chain: ProcessingChain | null = null
let callbacks: AudioProcessingCallbacks | null = null
let compressionEnabled = false
let failed = false
let wasActive = false
let silentMs = 0
let lastPlaybackTime = -1
let analyserBuffer: Float32Array<ArrayBuffer> | null = null
const captured = new Set<HTMLMediaElement>()

function musicKitElements(): HTMLMediaElement[] {
  return Array.from(
    document.querySelectorAll<HTMLMediaElement>(
      `audio[id="${MUSICKIT_AUDIO_ID}"]`,
    ),
  )
}

/**
 * True while every MusicKit element plays through the graph, so volume must
 * be applied to the graph (elements stay at 1) instead of to MusicKit.
 */
export function isAudioProcessingActive(): boolean {
  if (!context || context.state !== 'running') return false
  const elements = musicKitElements()
  return elements.length > 0 && elements.every((el) => captured.has(el))
}

function notifyIfActiveChanged() {
  const active = isAudioProcessingActive()
  if (active !== wasActive) {
    wasActive = active
    callbacks?.onActiveChange()
  }
}

function captureElements() {
  if (context && chain && context.state === 'running') {
    for (const element of musicKitElements()) {
      if (captured.has(element)) continue
      try {
        context.createMediaElementSource(element).connect(chain.input)
        captured.add(element)
        // Volume now lives in the graph so the compressor sees a steady level.
        element.volume = 1
      } catch {
        // Already routed into another context; leave it playing directly.
      }
    }
  }
  notifyIfActiveChanged()
}

function checkForSilence() {
  if (!context || !chain || failed) return

  const playing = musicKitElements().find((el) => !el.paused && !el.ended)
  if (!playing) {
    silentMs = 0
    return
  }

  // Playback started without a fresh user gesture (media keys, auto-advance):
  // the page has interacted before, so resuming is allowed now.
  if (context.state !== 'running') {
    silentMs = 0
    void context.resume()
    return
  }
  if (!captured.has(playing)) return

  analyserBuffer ??= new Float32Array(chain.analyser.fftSize)
  chain.analyser.getFloatTimeDomainData(analyserBuffer)
  const advancing = playing.currentTime !== lastPlaybackTime
  lastPlaybackTime = playing.currentTime

  silentMs = nextSilentDuration(
    silentMs,
    {
      advancing,
      audible: playing.volume > 0 && !playing.muted,
      silent: analyserBuffer.every((value) => value === 0),
    },
    SILENCE_CHECK_MS,
  )

  if (silentMs >= SILENCE_LIMIT_MS) {
    failed = true
    callbacks?.onSilence()
  }
}

/**
 * Start routing MusicKit's audio through the stable-volume graph. Idempotent;
 * returns false when Web Audio is unavailable or processing already failed.
 * Call from a user gesture where possible so the AudioContext can start.
 */
export function startAudioProcessing(
  processingCallbacks: AudioProcessingCallbacks,
): boolean {
  if (failed || typeof AudioContext === 'undefined') return false
  callbacks = processingCallbacks

  if (!context) {
    context = new AudioContext({ latencyHint: 'playback' })
    chain = createProcessingChain(context)
    context.addEventListener('statechange', captureElements)
    // MusicKit appends a fresh <audio> to <body> when it switches players.
    new MutationObserver(captureElements).observe(document.body, {
      childList: true,
    })
    setInterval(checkForSilence, SILENCE_CHECK_MS)
    window.__musictronAudioProbe = getAudioProcessingDebug
  }

  setStableVolumeCompression(true)
  resumeAudioProcessing()
  captureElements()
  return true
}

/** Bypass or re-enable the compressor without tearing down the graph. */
export function setStableVolumeCompression(enabled: boolean) {
  compressionEnabled = enabled
  chain?.setCompressionEnabled(enabled)
}

/** Resume a suspended AudioContext; call from user-initiated playback. */
export function resumeAudioProcessing() {
  if (context && context.state !== 'running' && context.state !== 'closed') {
    void context.resume()
  }
}

/** Set the graph's normalization and volume gains (fading on track changes). */
export function setProcessingGains(
  normalization: number,
  volume: number,
  { fade = false }: { fade?: boolean } = {},
) {
  if (!context || !chain) return
  const timeConstant = fade ? GAIN_FADE_SECONDS : GAIN_SMOOTHING_SECONDS
  const now = context.currentTime
  chain.input.gain.setTargetAtTime(normalization, now, timeConstant)
  chain.output.gain.setTargetAtTime(volume, now, timeConstant)
}

/** Snapshot for `window.__musictronAudioProbe()` when testing in a browser. */
export function getAudioProcessingDebug() {
  const elements = typeof document === 'undefined' ? [] : musicKitElements()
  return {
    supported: typeof AudioContext !== 'undefined',
    started: context !== null,
    contextState: context?.state ?? null,
    sampleRate: context?.sampleRate ?? null,
    active: isAudioProcessingActive(),
    compressing: compressionEnabled,
    failed,
    silentMs,
    compressorReductionDb: chain?.compressor.reduction ?? null,
    normalizationGain: chain?.input.gain.value ?? null,
    volumeGain: chain?.output.gain.value ?? null,
    elements: elements.map((el) => ({
      captured: captured.has(el),
      paused: el.paused,
      currentTime: el.currentTime,
      volume: el.volume,
      src: el.currentSrc.slice(0, 60),
    })),
  }
}
