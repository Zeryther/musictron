import React from 'react'
import { cn, formatTime, formatArtworkUrl } from '@/lib/utils'
import { Artwork } from '@/components/ui/artwork'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { usePlayerStore } from '@/stores/player-store'
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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="h-[88px] border-t border-border/50 bg-background/80 backdrop-blur-xl flex flex-col">
      {/* Progress bar - thin line at top of player */}
      <div className="px-4 pt-1">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={([val]) => seekTo(val)}
          className="h-4"
          trackClassName="h-[3px]"
          rangeClassName="bg-foreground/60 group-hover:bg-primary"
        />
      </div>

      <div className="flex-1 flex items-center px-4 gap-4">
        {/* Now playing info - left */}
        <div className="flex items-center gap-3 w-[280px] min-w-0">
          {nowPlaying ? (
            <>
              <Artwork
                src={nowPlaying.artworkUrl}
                alt={nowPlaying.name}
                size={48}
                rounded="sm"
                onClick={() => setFullscreen(true)}
                className="cursor-pointer"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium line-clamp-1">
                  {nowPlaying.name}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {nowPlaying.artistName}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-muted" />
              <div>
                <p className="text-sm text-muted-foreground">Not Playing</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls - center */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <Button
              variant="player"
              size="icon-sm"
              onClick={toggleShuffle}
              className={cn(shuffleMode !== 0 && 'text-primary')}
            >
              <Shuffle className="w-4 h-4" />
            </Button>

            <Button variant="player" size="icon" onClick={skipPrevious}>
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </Button>

            <Button
              variant="default"
              size="icon-lg"
              className="rounded-full mx-1"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
              )}
            </Button>

            <Button variant="player" size="icon" onClick={skipNext}>
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </Button>

            <Button
              variant="player"
              size="icon-sm"
              onClick={toggleRepeat}
              className={cn(repeatMode !== 0 && 'text-primary')}
            >
              {repeatMode === 1 ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Time display */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <span>/</span>
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 w-[200px] justify-end">
          <Button
            variant="player"
            size="icon-sm"
            onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>

          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={([val]) => setVolume(val)}
            className="w-24"
          />

          <Button
            variant="player"
            size="icon-sm"
            onClick={toggleQueue}
            className={cn(isQueueOpen && 'text-primary')}
          >
            <ListMusic className="w-4 h-4" />
          </Button>

          <Button
            variant="player"
            size="icon-sm"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
