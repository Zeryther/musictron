// Experimental "stable volume": route MusicKit's <audio> elements through Web
// Audio and compress the loud and quiet moments within a song, like YouTube's
// Stable Volume.
//
// Browsers may refuse to hand protected or cross-origin audio to Web Audio.
// Chromium then mutes the element; Safari (which plays Apple Music as a
// direct HLS stream) keeps playing it straight to the speakers, bypassing the
// graph. Either way the graph only ever sees silence. So volume control moves
// into the graph only once real sound has been seen flowing through it; until
// then, and after a failure, the element's own volume is used. A watchdog
// detects the silence and turns the feature off.

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

/** Time constant for gain fades on track changes. */
const GAIN_FADE_SECONDS = 0.1

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
  // Gains start at unity: until processing is verified the element's own
  // volume is in charge and the graph just passes it through.
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
/** Source that has produced sound through the graph; it can't be muted. */
let heardSrc: string | null = null
let analyserBuffer: Float32Array<ArrayBuffer> | null = null
const captured = new Set<HTMLMediaElement>()
/** Elements whose audio has been seen in the graph, not just routed to it. */
const verified = new WeakSet<HTMLMediaElement>()
/** The element MusicKit is playing through (or last played through). */
let currentElement: HTMLMediaElement | null = null

function musicKitElements(): HTMLMediaElement[] {
  return Array.from(
    document.querySelectorAll<HTMLMediaElement>(
      `audio[id="${MUSICKIT_AUDIO_ID}"]`,
    ),
  )
}

/**
 * True while MusicKit's current element verifiably plays through the graph,
 * so volume must be applied to the graph (MusicKit stays at 1). False while
 * merely routed: in Safari the audio may bypass the graph entirely, and
 * holding the element at full volume would then blast at full volume.
 */
export function isAudioProcessingActive(): boolean {
  if (failed || !context || context.state !== 'running') return false
  return (
    currentElement !== null &&
    currentElement.isConnected &&
    captured.has(currentElement) &&
    verified.has(currentElement)
  )
}

function notifyIfActiveChanged() {
  const active = isAudioProcessingActive()
  if (active !== wasActive) {
    wasActive = active
    callbacks?.onActiveChange()
  }
}

function captureElements() {
  // After a failure, leave new elements playing directly so they're audible.
  if (context && chain && context.state === 'running' && !failed) {
    for (const element of musicKitElements()) {
      if (captured.has(element)) continue
      try {
        context.createMediaElementSource(element).connect(chain.input)
        captured.add(element)
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
  currentElement = playing

  // Playback started without a fresh user gesture (media keys, auto-advance):
  // the page has interacted before, so resuming is allowed now.
  if (context.state !== 'running') {
    silentMs = 0
    resumeAudioProcessing()
    return
  }
  if (captured.has(playing)) checkElement(playing)
  if (!failed) notifyIfActiveChanged()
}

function checkElement(playing: HTMLMediaElement) {
  if (!chain) return
  analyserBuffer ??= new Float32Array(chain.analyser.fftSize)
  chain.analyser.getFloatTimeDomainData(analyserBuffer)
  const advancing = playing.currentTime !== lastPlaybackTime
  lastPlaybackTime = playing.currentTime

  // A browser that mutes processed audio never yields a single sample, so
  // once a source has been heard its silent passages (hidden-track gaps,
  // outros) are real silence, not a failure.
  const silent = analyserBuffer.every((value) => value === 0)
  if (!silent) {
    heardSrc = playing.currentSrc
    verified.add(playing)
  }

  silentMs = nextSilentDuration(
    silentMs,
    {
      advancing,
      audible: playing.volume > 0 && !playing.muted,
      silent: silent && heardSrc !== playing.currentSrc,
    },
    SILENCE_CHECK_MS,
  )

  if (silentMs >= SILENCE_LIMIT_MS) {
    failed = true
    // Hand volume back to the element first: in Safari it's still audible.
    notifyIfActiveChanged()
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
    // Rejects without a user gesture in some browsers; the next play retries.
    context.resume().catch(() => {})
  }
}

/**
 * Set the graph's normalization and volume gains: faded on track changes,
 * otherwise immediately (like a media element's volume).
 */
export function setProcessingGains(
  normalization: number,
  volume: number,
  { fade = false }: { fade?: boolean } = {},
) {
  if (!context || !chain) return
  const now = context.currentTime
  for (const [param, value] of [
    [chain.input.gain, normalization],
    [chain.output.gain, volume],
  ] as const) {
    param.cancelScheduledValues(now)
    if (fade) param.setTargetAtTime(value, now, GAIN_FADE_SECONDS)
    else param.setValueAtTime(value, now)
  }
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
      current: el === currentElement,
      captured: captured.has(el),
      verified: verified.has(el),
      paused: el.paused,
      currentTime: el.currentTime,
      volume: el.volume,
      src: el.currentSrc.slice(0, 60),
    })),
  }
}
