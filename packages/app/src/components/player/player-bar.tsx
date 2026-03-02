import React from 'react'
import { useNavigate } from 'react-router-dom'
import { cn, formatTime } from '@/lib/utils'
import { Artwork } from '@/components/ui/artwork'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { usePlayerStore } from '@/stores/player-store'
import { useLastfmStore } from '@/stores/lastfm-store'
import { useLastfmLove, useLastfmTrack } from '@/hooks/use-lastfm'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  Maximize2,
  Heart,
} from 'lucide-react'

export function PlayerBar() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    nowPlaying,
    repeatMode,
    shuffleMode,
    isQueueOpen,
    togglePlayPause,
    skipNext,
    skipPrevious,
    seekTo,
    setVolume,
    toggleRepeat,
    toggleShuffle,
    toggleQueue,
    setFullscreen,
  } = usePlayerStore()
  const navigate = useNavigate()
  const lastfmConnected = useLastfmStore((s) => s.isConnected)
  const { mutate: sendLove, isPending: isLoveLoading } = useLastfmLove()
  const { data: lastfmTrack } = useLastfmTrack(
    nowPlaying?.artistName,
    nowPlaying?.name,
  )
  const isLoved = lastfmTrack?.userLoved ?? false

  return (
    <div className="h-[84px] border-t border-white/[0.06] surface-glass-heavy flex flex-col shrink-0">
      {/* Progress bar */}
      <div className="px-4 -mt-[6px]">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={([val]) => seekTo(val)}
          className="h-3"
          trackClassName="h-[2px] group-hover/slider:h-[4px] bg-white/[0.08]"
          rangeClassName="bg-foreground/50 group-hover/slider:bg-foreground"
        />
      </div>

      <div className="flex-1 flex items-center px-5 gap-4">
        {/* Now playing info — left */}
        <div className="flex items-center gap-3 w-[260px] min-w-0 group/now-playing">
          {nowPlaying ? (
            <>
              <Artwork
                src={nowPlaying.artworkUrl}
                alt={nowPlaying.name}
                size={48}
                rounded="sm"
                onClick={() => setFullscreen(true)}
                className="cursor-pointer shadow-lg shadow-black/30"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium line-clamp-1 leading-tight">
                  {nowPlaying.name}
                </p>
                <p className="text-[12px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
                  {nowPlaying.artistId ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/artist/${nowPlaying.artistId}`)
                      }}
                      className="hover:underline hover:text-foreground transition-colors"
                    >
                      {nowPlaying.artistName}
                    </button>
                  ) : (
                    nowPlaying.artistName
                  )}
                </p>
              </div>
              {lastfmConnected && (
                <Button
                  variant="player"
                  size="icon-sm"
                  disabled={isLoveLoading}
                  onClick={() =>
                    sendLove({
                      artist: nowPlaying.artistName,
                      track: nowPlaying.name,
                      love: !isLoved,
                    })
                  }
                  className={cn(
                    'shrink-0 transition-opacity',
                    isLoved
                      ? 'opacity-100 text-red-500'
                      : 'opacity-0 group-hover/now-playing:opacity-100',
                  )}
                >
                  <Heart
                    className="w-[14px] h-[14px]"
                    fill={isLoved ? 'currentColor' : 'none'}
                  />
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-muted/60" />
              <p className="text-[13px] text-muted-foreground">Not Playing</p>
            </div>
          )}
        </div>

        {/* Controls — center */}
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1">
            <Button
              variant="player"
              size="icon-sm"
              onClick={toggleShuffle}
              className={cn(shuffleMode !== 0 && 'text-primary')}
            >
              <Shuffle className="w-[15px] h-[15px]" />
            </Button>

            <Button variant="player" size="icon" onClick={skipPrevious}>
              <SkipBack className="w-[18px] h-[18px]" fill="currentColor" />
            </Button>

            <button
              className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center mx-0.5 hover:scale-105 active:scale-95 transition-transform duration-100"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-[16px] h-[16px]" fill="currentColor" />
              ) : (
                <Play
                  className="w-[16px] h-[16px] ml-[1px]"
                  fill="currentColor"
                />
              )}
            </button>

            <Button variant="player" size="icon" onClick={skipNext}>
              <SkipForward className="w-[18px] h-[18px]" fill="currentColor" />
            </Button>

            <Button
              variant="player"
              size="icon-sm"
              onClick={toggleRepeat}
              className={cn(repeatMode !== 0 && 'text-primary')}
            >
              {repeatMode === 1 ? (
                <Repeat1 className="w-[15px] h-[15px]" />
              ) : (
                <Repeat className="w-[15px] h-[15px]" />
              )}
            </Button>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
            <span className="w-9 text-right">{formatTime(currentTime)}</span>
            <span className="opacity-60">/</span>
            <span className="w-9">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 w-[200px] justify-end">
          <Button
            variant="player"
            size="icon-sm"
            onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
          >
            {volume === 0 ? (
              <VolumeX className="w-[15px] h-[15px]" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-[15px] h-[15px]" />
            ) : (
              <Volume2 className="w-[15px] h-[15px]" />
            )}
          </Button>

          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={([val]) => setVolume(val)}
            className="w-[88px]"
          />

          <Button
            variant="player"
            size="icon-sm"
            onClick={toggleQueue}
            className={cn(isQueueOpen && 'text-primary')}
          >
            <ListMusic className="w-[15px] h-[15px]" />
          </Button>

          <Button
            variant="player"
            size="icon-sm"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 className="w-[15px] h-[15px]" />
          </Button>
        </div>
      </div>
    </div>
  )
}
