import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getNormalizationGain } from '@/lib/loudness'

export type NormalizationLevel = 'quiet' | 'balanced' | 'loud'

/** Target loudness per level, in LUFS. Balanced matches Apple's Sound Check. */
export const NORMALIZATION_TARGETS: Record<NormalizationLevel, number> = {
  quiet: -20,
  balanced: -16,
  loud: -12,
}

/**
 * Loudness assumed for tracks that can't be measured (no preview, decode
 * failure) — typical of modern streaming masters, so they don't play much
 * louder than their measured neighbours.
 */
export const ASSUMED_TRACK_LOUDNESS = -10

/** Measured tracks remembered across sessions. */
const MAX_CACHED_TRACKS = 1000

export interface CachedLoudness {
  /** Integrated loudness of the track's preview, in LUFS. */
  lufs: number
  /** When it was measured (ms since epoch); used to evict the oldest. */
  measuredAt: number
}

export interface NormalizedTrack {
  songId: string
  status: 'pending' | 'ready' | 'unavailable'
  /** Measured loudness in LUFS, once `status` is `ready`. */
  loudness: number | null
}

interface VolumeNormalizationState {
  enabled: boolean
  level: NormalizationLevel
  /** Measured loudness keyed by catalog song id. */
  loudnessCache: Record<string, CachedLoudness>
  /** Normalization state of the now-playing track. */
  track: NormalizedTrack | null
  /** Loudness of the last measured track, held while the next one measures. */
  previousLoudness: number | null
  /** Experimental: compress loud/quiet moments within songs via Web Audio. */
  stableVolume: boolean
  /** Stable volume silenced playback this session; a reload is needed. */
  stableVolumeFailed: boolean

  setEnabled: (enabled: boolean) => void
  setLevel: (level: NormalizationLevel) => void
  rememberLoudness: (songId: string, lufs: number) => void
  setTrack: (track: NormalizedTrack | null) => void
  setStableVolume: (enabled: boolean) => void
  markStableVolumeFailed: () => void
}

export const useVolumeNormalizationStore = create<VolumeNormalizationState>()(
  persist(
    (set) => ({
      enabled: true,
      level: 'balanced',
      loudnessCache: {},
      track: null,
      previousLoudness: null,
      stableVolume: false,
      stableVolumeFailed: false,

      setEnabled: (enabled) => set({ enabled }),

      setLevel: (level) => set({ level }),

      rememberLoudness: (songId, lufs) =>
        set((state) => {
          const loudnessCache = {
            ...state.loudnessCache,
            [songId]: { lufs, measuredAt: Date.now() },
          }
          return { loudnessCache: trimCache(loudnessCache) }
        }),

      setTrack: (track) =>
        set((state) => ({
          track,
          previousLoudness:
            track?.status === 'ready' ? track.loudness : state.previousLoudness,
        })),

      setStableVolume: (stableVolume) =>
        set((state) => (state.stableVolumeFailed ? {} : { stableVolume })),

      markStableVolumeFailed: () =>
        set({ stableVolume: false, stableVolumeFailed: true }),
    }),
    {
      name: 'musictron-volume-normalization',
      partialize: (state) => ({
        enabled: state.enabled,
        level: state.level,
        loudnessCache: state.loudnessCache,
        stableVolume: state.stableVolume,
      }),
    },
  ),
)

function trimCache(
  cache: Record<string, CachedLoudness>,
): Record<string, CachedLoudness> {
  const entries = Object.entries(cache)
  if (entries.length <= MAX_CACHED_TRACKS) return cache
  entries.sort(([, a], [, b]) => b.measuredAt - a.measuredAt)
  return Object.fromEntries(entries.slice(0, MAX_CACHED_TRACKS))
}

/**
 * Loudness to normalize the now-playing track against. While a track is
 * still being measured the previous track's loudness is kept, which avoids
 * a volume jump within an album.
 */
export function selectEffectiveLoudness(
  state: Pick<VolumeNormalizationState, 'track' | 'previousLoudness'>,
): number {
  const { track, previousLoudness } = state
  if (track?.status === 'ready' && track.loudness !== null) {
    return track.loudness
  }
  if (track?.status === 'pending' && previousLoudness !== null) {
    return previousLoudness
  }
  return ASSUMED_TRACK_LOUDNESS
}

/** Multiplier applied on top of the user's volume for the current track. */
export function selectNormalizationGain(
  state: Pick<
    VolumeNormalizationState,
    'enabled' | 'level' | 'track' | 'previousLoudness'
  >,
): number {
  if (!state.enabled) return 1
  // Guard against an unknown level in persisted state (edited, or written by
  // a newer version).
  const target =
    NORMALIZATION_TARGETS[state.level] ?? NORMALIZATION_TARGETS.balanced
  return getNormalizationGain(selectEffectiveLoudness(state), target)
}
