import { useMemo } from 'react'
import { findPlayingTrackIndex, usePlayerStore } from '@/stores/player-store'

/**
 * Index of the row in `trackIds` that is playing, or -1. Pass the same
 * `contextKey` given to the player when playing from this list so a song that
 * appears more than once only highlights the occurrence actually playing.
 */
export function usePlayingTrackIndex(
  trackIds: string[],
  contextKey: string,
): number {
  const nowPlaying = usePlayerStore((s) => s.nowPlaying)
  const queue = usePlayerStore((s) => s.queue)
  const queuePosition = usePlayerStore((s) => s.queuePosition)
  const playContext = usePlayerStore((s) => s.playContext)
  const shuffleMode = usePlayerStore((s) => s.shuffleMode)

  return useMemo(
    () =>
      findPlayingTrackIndex(trackIds, contextKey, {
        nowPlaying,
        queue,
        queuePosition,
        playContext,
        shuffleMode,
      }),
    [
      trackIds,
      contextKey,
      nowPlaying,
      queue,
      queuePosition,
      playContext,
      shuffleMode,
    ],
  )
}
