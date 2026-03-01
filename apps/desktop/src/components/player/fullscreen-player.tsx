import React from 'react'
import { cn, formatTime } from '@/lib/utils'
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
  VolumeX,
  Minimize2,
  ListMusic,
} from 'lucide-react'

export function FullscreenPlayer() {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    nowPlaying,
    repeatMode,
    shuffleMode,
    togglePlayPause,
    skipNext,
    skipPrevious,
    seekTo,
    setVolume,
    toggleRepeat,
    toggleShuffle,
    setFullscreen,
    toggleQueue,
  } = usePlayerStore()

  if (!nowPlaying) return null

  const bgColor = nowPlaying.artworkColors?.bg || '#0a0a0a'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${bgColor}ee, ${bgColor}dd, #0a0a0aff)`,
      }}
    >
      {/* Close button */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white hover:bg-white/10"
          onClick={toggleQueue}
        >
          <ListMusic className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white hover:bg-white/10"
          onClick={() => setFullscreen(false)}
        >
          <Minimize2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Artwork */}
      <div className="mb-10">
        <Artwork
          src={nowPlaying.artworkUrl}
          alt={nowPlaying.name}
          size={340}
          rounded="lg"
          shadow
        />
      </div>

      {/* Song info */}
      <div className="text-center mb-8 max-w-md">
        <h2 className="text-2xl font-bold text-white mb-1">{nowPlaying.name}</h2>
        <p className="text-lg text-white/60">{nowPlaying.artistName}</p>
        <p className="text-sm text-white/40 mt-1">{nowPlaying.albumName}</p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-md px-4 mb-6">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={([val]) => seekTo(val)}
          trackClassName="h-1 bg-white/20"
          rangeClassName="bg-white"
          thumbClassName="bg-white opacity-100"
        />
        <div className="flex justify-between mt-2 text-xs text-white/50">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleShuffle}
          className={cn(
            'text-white/50 hover:text-white hover:bg-white/10',
            shuffleMode !== 0 && 'text-white',
          )}
        >
          <Shuffle className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-lg"
          onClick={skipPrevious}
          className="text-white hover:bg-white/10"
        >
          <SkipBack className="w-7 h-7" fill="currentColor" />
        </Button>

        <button
          onClick={togglePlayPause}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-black" fill="currentColor" />
          ) : (
            <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
          )}
        </button>

        <Button
          variant="ghost"
          size="icon-lg"
          onClick={skipNext}
          className="text-white hover:bg-white/10"
        >
          <SkipForward className="w-7 h-7" fill="currentColor" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRepeat}
          className={cn(
            'text-white/50 hover:text-white hover:bg-white/10',
            repeatMode !== 0 && 'text-white',
          )}
        >
          {repeatMode === 1 ? (
            <Repeat1 className="w-5 h-5" />
          ) : (
            <Repeat className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 mt-8">
        <VolumeX className="w-4 h-4 text-white/40" />
        <Slider
          value={[volume]}
          max={1}
          step={0.01}
          onValueChange={([val]) => setVolume(val)}
          className="w-32"
          trackClassName="bg-white/20"
          rangeClassName="bg-white/70"
          thumbClassName="bg-white"
        />
        <Volume2 className="w-4 h-4 text-white/40" />
      </div>
    </div>
  )
}
