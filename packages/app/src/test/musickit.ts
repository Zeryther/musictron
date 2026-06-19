import { vi } from 'vitest'

/**
 * Build a fake MusicKit instance with `vi.fn()` methods and sensible default
 * playback state. Pass `overrides` to set props or replace methods per test.
 */
export function createMusicKitInstance(
  overrides: Partial<MusicKit.MusicKitInstance> = {},
): MusicKit.MusicKitInstance {
  const queue: MusicKit.Queue = {
    items: [],
    position: 0,
    length: 0,
    isEmpty: true,
    nextPlayableItem: null,
    previousPlayableItem: null,
  }

  const base = {
    isAuthorized: false,
    musicUserToken: '',
    developerToken: '',
    storefrontId: 'us',
    storefrontCountryCode: 'us',
    volume: 0.5,
    playbackState: 0,
    currentPlaybackTime: 0,
    currentPlaybackDuration: 0,
    nowPlayingItem: null,
    queue,
    repeatMode: 0,
    shuffleMode: 0,
    authorize: vi.fn(async () => 'mock-user-token'),
    unauthorize: vi.fn(async () => {}),
    play: vi.fn(async () => {}),
    pause: vi.fn(() => {}),
    stop: vi.fn(() => {}),
    skipToNextItem: vi.fn(async () => {}),
    skipToPreviousItem: vi.fn(async () => {}),
    seekToTime: vi.fn(async () => {}),
    setQueue: vi.fn(async () => queue),
    api: { music: vi.fn(async () => ({ data: {} })) },
    addEventListener: vi.fn(() => {}),
    removeEventListener: vi.fn(() => {}),
  }

  return Object.assign(base, overrides) as unknown as MusicKit.MusicKitInstance
}

export interface StubMusicKitResult {
  instance: MusicKit.MusicKitInstance
  configure: ReturnType<typeof vi.fn>
  getInstance: ReturnType<typeof vi.fn>
}

/**
 * Install a fake `window.MusicKit` so `getMusicKitInstance()` and
 * `configureMusicKit()` resolve. jsdom-only (needs `window`).
 */
export function stubMusicKit(
  overrides: Partial<MusicKit.MusicKitInstance> = {},
): StubMusicKitResult {
  const instance = createMusicKitInstance(overrides)
  const getInstance = vi.fn(() => instance)
  const configure = vi.fn(async () => instance)
  ;(window as unknown as { MusicKit: unknown }).MusicKit = {
    configure,
    getInstance,
  }
  return { instance, configure, getInstance }
}

/** Remove the fake `window.MusicKit`. */
export function clearMusicKit(): void {
  delete (window as unknown as { MusicKit?: unknown }).MusicKit
}
