import React from 'react'
import { useNavigate } from 'react-router-dom'
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

  const navigate = useNavigate()

  if (!nowPlaying) return null

  const bgColor = nowPlaying.artworkColors?.bg || '#0a0a0a'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-scale-in"
      style={{
        background: `linear-gradient(160deg, ${bgColor}e8 0%, ${bgColor}c0 40%, #09090b 100%)`,
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-end px-5 py-4 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white/90 hover:bg-white/[0.08]"
          onClick={toggleQueue}
        >
          <ListMusic className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white/90 hover:bg-white/[0.08]"
          onClick={() => setFullscreen(false)}
        >
          <Minimize2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Artwork */}
      <div className="mb-12">
        <Artwork
          src={nowPlaying.artworkUrl}
          alt={nowPlaying.name}
          size={380}
          rounded="lg"
          shadow
          className="shadow-2xl shadow-black/60"
        />
      </div>

      {/* Song info */}
      <div className="text-center mb-8 max-w-lg px-4">
        <h2 className="text-[22px] font-bold text-white leading-tight mb-1 line-clamp-2">
          {nowPlaying.name}
        </h2>
        <p className="text-[16px] text-white/70 font-medium line-clamp-1">
          {nowPlaying.artistId ? (
            <button
              onClick={() => {
                setFullscreen(false)
                navigate(`/artist/${nowPlaying.artistId}`)
              }}
              className="hover:underline hover:text-white/90 transition-colors"
            >
              {nowPlaying.artistName}
            </button>
          ) : (
            nowPlaying.artistName
          )}
        </p>
        {nowPlaying.albumName && (
          <p className="text-[13px] text-white/50 mt-1 line-clamp-1">
            {nowPlaying.albumId ? (
              <button
                onClick={() => {
                  setFullscreen(false)
                  navigate(`/album/${nowPlaying.albumId}`)
                }}
                className="hover:underline hover:text-white/70 transition-colors"
              >
                {nowPlaying.albumName}
              </button>
            ) : (
              nowPlaying.albumName
            )}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="w-full max-w-md px-6 mb-8">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={([val]) => seekTo(val)}
          trackClassName="h-1 bg-white/[0.12]"
          rangeClassName="bg-white/80"
          thumbClassName="bg-white scale-100"
        />
        <div className="flex justify-between mt-2 text-[12px] tabular-nums text-white/55">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleShuffle}
          className={cn(
            'text-white/50 hover:text-white/80 hover:bg-white/[0.08]',
            shuffleMode !== 0 && 'text-white/90',
          )}
        >
          <Shuffle className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-lg"
          onClick={skipPrevious}
          className="text-white/80 hover:text-white hover:bg-white/[0.06]"
        >
          <SkipBack className="w-7 h-7" fill="currentColor" />
        </Button>

        <button
          onClick={togglePlayPause}
          className="w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center hover:scale-[1.04] active:scale-[0.96] transition-transform duration-100"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-black" fill="currentColor" />
          ) : (
            <Play className="w-7 h-7 text-black ml-[2px]" fill="currentColor" />
          )}
        </button>

        <Button
          variant="ghost"
          size="icon-lg"
          onClick={skipNext}
          className="text-white/80 hover:text-white hover:bg-white/[0.06]"
        >
          <SkipForward className="w-7 h-7" fill="currentColor" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRepeat}
          className={cn(
            'text-white/50 hover:text-white/80 hover:bg-white/[0.08]',
            repeatMode !== 0 && 'text-white/90',
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
      <div className="flex items-center gap-2.5 mt-10">
        <VolumeX className="w-3.5 h-3.5 text-white/50" />
        <Slider
          value={[volume]}
          max={1}
          step={0.01}
          onValueChange={([val]) => setVolume(val)}
          className="w-[120px]"
          trackClassName="bg-white/[0.12]"
          rangeClassName="bg-white/50"
          thumbClassName="bg-white"
        />
        <Volume2 className="w-3.5 h-3.5 text-white/50" />
      </div>
    </div>
  )
}
