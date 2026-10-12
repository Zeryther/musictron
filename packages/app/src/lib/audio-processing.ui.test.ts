import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as AudioProcessingModule from '@/lib/audio-processing'

type AudioProcessing = typeof AudioProcessingModule

class FakeParam {
  value = 1
  cancelScheduledValues = vi.fn()
  setValueAtTime = vi.fn((value: number) => {
    this.value = value
  })
  setTargetAtTime = vi.fn((value: number) => {
    this.value = value
  })
}

class FakeNode {
  connections: FakeNode[] = []
  connect = vi.fn((node: FakeNode) => {
    this.connections.push(node)
    return node
  })
  disconnect = vi.fn(() => {
    this.connections = []
  })
}

class FakeGain extends FakeNode {
  gain = new FakeParam()
}

class FakeAnalyser extends FakeNode {
  fftSize = 2048
  level = 0
  getFloatTimeDomainData(buffer: Float32Array) {
    buffer.fill(this.level)
  }
}

class FakeCompressor extends FakeNode {
  threshold = new FakeParam()
  knee = new FakeParam()
  ratio = new FakeParam()
  attack = new FakeParam()
  release = new FakeParam()
  reduction = 0
}

class FakeAudioContext extends EventTarget {
  static latest: FakeAudioContext
  state: AudioContextState = 'running'
  currentTime = 0
  sampleRate = 48000
  destination = new FakeNode()
  analyser = new FakeAnalyser()
  compressor = new FakeCompressor()
  gains: FakeGain[] = []
  createMediaElementSource = vi.fn(() => new FakeNode())

  constructor() {
    super()
    FakeAudioContext.latest = this
  }
  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }
  createAnalyser() {
    return this.analyser
  }
  createDynamicsCompressor() {
    return this.compressor
  }
  resume = vi.fn(async () => {
    this.setState('running')
  })
  setState(state: AudioContextState) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

function addMusicKitAudio(): HTMLAudioElement {
  const element = document.createElement('audio')
  element.id = 'apple-music-player'
  element.volume = 0.4
  document.body.appendChild(element)
  return element
}

/** Make a jsdom media element look like it's playing and advancing. */
function fakePlayback(element: HTMLMediaElement) {
  let time = 0
  Object.defineProperty(element, 'paused', { get: () => false })
  Object.defineProperty(element, 'currentTime', { get: () => (time += 0.5) })
}

let processing: AudioProcessing
const callbacks = { onActiveChange: vi.fn(), onSilence: vi.fn() }

beforeEach(async () => {
  vi.useFakeTimers()
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.resetModules()
  processing = await import('@/lib/audio-processing')
})

afterEach(() => {
  // A fresh <body>, so earlier module instances' MutationObservers (left
  // behind by vi.resetModules) watch a detached node.
  document.body = document.createElement('body')
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('nextSilentDuration', () => {
  it('only accumulates while audible playback advances in silence', () => {
    const { nextSilentDuration } = processing
    const silent = { advancing: true, audible: true, silent: true }
    expect(nextSilentDuration(1000, silent, 500)).toBe(1500)
    expect(nextSilentDuration(1000, { ...silent, silent: false }, 500)).toBe(0)
    expect(nextSilentDuration(1000, { ...silent, advancing: false }, 500)).toBe(
      0,
    )
    expect(nextSilentDuration(1000, { ...silent, audible: false }, 500)).toBe(0)
  })
})

describe('createProcessingChain', () => {
  it('switches the compressor in and out of the signal path', () => {
    const context = new FakeAudioContext()
    const chain = processing.createProcessingChain(
      context as unknown as BaseAudioContext,
    )

    chain.setCompressionEnabled(true)
    expect(context.analyser.connections).toEqual([context.compressor])
    expect(context.compressor.threshold.value).toBe(-30)

    chain.setCompressionEnabled(false)
    expect(context.analyser.connections).toEqual([chain.output])
  })
})

describe('startAudioProcessing', () => {
  it('routes MusicKit elements through the graph as they appear', async () => {
    expect(processing.startAudioProcessing(callbacks)).toBe(true)
    expect(processing.isAudioProcessingActive()).toBe(false)

    const element = addMusicKitAudio()
    await Promise.resolve() // MutationObserver callback

    const context = FakeAudioContext.latest
    expect(context.createMediaElementSource).toHaveBeenCalledWith(element)
    expect(element.volume).toBe(1)
    expect(processing.isAudioProcessingActive()).toBe(true)
    expect(callbacks.onActiveChange).toHaveBeenCalled()
  })

  it('waits for a suspended context to start before capturing', async () => {
    vi.stubGlobal(
      'AudioContext',
      class extends FakeAudioContext {
        state: AudioContextState = 'suspended'
        resume = vi.fn(async () => {})
      },
    )
    vi.resetModules()
    processing = await import('@/lib/audio-processing')

    const element = addMusicKitAudio()
    processing.startAudioProcessing(callbacks)
    const context = FakeAudioContext.latest
    expect(context.createMediaElementSource).not.toHaveBeenCalled()
    expect(element.volume).toBe(0.4)

    context.setState('running')
    expect(context.createMediaElementSource).toHaveBeenCalledWith(element)
    expect(processing.isAudioProcessingActive()).toBe(true)
  })

  it('reports silent playback once it has lasted long enough', () => {
    const element = addMusicKitAudio()
    processing.startAudioProcessing(callbacks)
    fakePlayback(element)

    vi.advanceTimersByTime(processing.SILENCE_LIMIT_MS - 500)
    expect(callbacks.onSilence).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(callbacks.onSilence).toHaveBeenCalledTimes(1)
    expect(processing.startAudioProcessing(callbacks)).toBe(false)
  })

  it('does not report playback that produces sound', () => {
    const element = addMusicKitAudio()
    processing.startAudioProcessing(callbacks)
    fakePlayback(element)
    FakeAudioContext.latest.analyser.level = 0.2

    vi.advanceTimersByTime(processing.SILENCE_LIMIT_MS * 2)
    expect(callbacks.onSilence).not.toHaveBeenCalled()
  })
})

describe('setProcessingGains', () => {
  it('starts the graph silent until the player sets real gains', () => {
    processing.startAudioProcessing(callbacks)
    const [input, output] = FakeAudioContext.latest.gains
    expect(input?.gain.value).toBe(0)
    expect(output?.gain.value).toBe(0)
  })

  it('applies volume changes immediately', () => {
    processing.startAudioProcessing(callbacks)
    const [input, output] = FakeAudioContext.latest.gains

    processing.setProcessingGains(0.5, 0.8)

    expect(input?.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 0)
    expect(output?.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 0)
    expect(output?.gain.setTargetAtTime).not.toHaveBeenCalled()
  })

  it('fades the normalization and volume gains', () => {
    processing.startAudioProcessing(callbacks)
    const [input, output] = FakeAudioContext.latest.gains

    processing.setProcessingGains(0.5, 0.8, { fade: true })

    expect(input?.gain.setTargetAtTime).toHaveBeenCalledWith(0.5, 0, 0.1)
    expect(output?.gain.setTargetAtTime).toHaveBeenCalledWith(0.8, 0, 0.1)
  })
})

describe('silence watchdog', () => {
  function playSource(element: HTMLMediaElement, src: string) {
    Object.defineProperty(element, 'currentSrc', {
      configurable: true,
      get: () => src,
    })
  }

  it('ignores real silence in a source that has already produced sound', () => {
    const element = addMusicKitAudio()
    processing.startAudioProcessing(callbacks)
    fakePlayback(element)
    playSource(element, 'blob:track-1')
    const { analyser } = FakeAudioContext.latest

    analyser.level = 0.2
    vi.advanceTimersByTime(1000)
    analyser.level = 0 // e.g. a long silent outro
    vi.advanceTimersByTime(processing.SILENCE_LIMIT_MS * 2)

    expect(callbacks.onSilence).not.toHaveBeenCalled()
  })

  it('still catches a new source that never produces sound', () => {
    const element = addMusicKitAudio()
    processing.startAudioProcessing(callbacks)
    fakePlayback(element)
    playSource(element, 'blob:track-1')
    const { analyser } = FakeAudioContext.latest

    analyser.level = 0.2
    vi.advanceTimersByTime(1000)
    analyser.level = 0
    playSource(element, 'https://audio-ssl.itunes.apple.com/preview.m4a')
    vi.advanceTimersByTime(processing.SILENCE_LIMIT_MS + 500)

    expect(callbacks.onSilence).toHaveBeenCalledTimes(1)
  })

  it('stops capturing new elements after a failure', async () => {
    const first = addMusicKitAudio()
    processing.startAudioProcessing(callbacks)
    fakePlayback(first)
    vi.advanceTimersByTime(processing.SILENCE_LIMIT_MS + 500)
    expect(callbacks.onSilence).toHaveBeenCalled()

    const second = addMusicKitAudio()
    await Promise.resolve() // MutationObserver callback

    const context = FakeAudioContext.latest
    // Only the first element; jsdom elements compare deeply equal, so count.
    expect(context.createMediaElementSource).toHaveBeenCalledTimes(1)
    expect(second.volume).toBe(0.4)
    expect(processing.isAudioProcessingActive()).toBe(false)
  })
})
