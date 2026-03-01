import React from 'react'
import { cn, formatArtworkUrl, formatDuration } from '@/lib/utils'
import { Artwork } from './artwork'
import {
  Play,
  Pause,
  MoreHorizontal,
  ListPlus,
  ListEnd,
  Heart,
} from 'lucide-react'
import { usePlayerStore } from '@/stores/player-store'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './dropdown-menu'

interface SongRowProps {
  id: string
  name: string
  artistName: string
  albumName?: string
  artworkUrl?: string
  duration: number
  trackNumber?: number
  showArtwork?: boolean
  showAlbum?: boolean
  showTrackNumber?: boolean
  isActive?: boolean
  isPlaying?: boolean
  className?: string
  onClick?: () => void
  onPlayNext?: () => void
  onAddToQueue?: () => void
}

export function SongRow({
  id,
  name,
  artistName,
  albumName,
  artworkUrl,
  duration,
  trackNumber,
  showArtwork = true,
  showAlbum = true,
  showTrackNumber = false,
  isActive = false,
  isPlaying = false,
  className,
  onClick,
}: SongRowProps) {
  const { playTrack, playNext, addToQueue } = usePlayerStore()

  const handlePlay = () => {
    if (onClick) {
      onClick()
    } else {
      playTrack(id)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-3 py-[7px] rounded-lg transition-colors duration-100 cursor-pointer',
        isActive
          ? 'bg-primary/[0.08]'
          : 'hover:bg-white/[0.04]',
        className,
      )}
      onDoubleClick={handlePlay}
    >
      {/* Track number / play icon / equalizer */}
      <div className="w-7 flex items-center justify-center flex-shrink-0">
        {showTrackNumber ? (
          <>
            <span
              className={cn(
                'text-[13px] tabular-nums text-muted-foreground group-hover:hidden',
                isActive && 'text-primary',
              )}
            >
              {trackNumber}
            </span>
            <button
              onClick={handlePlay}
              className="hidden group-hover:flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 text-primary" fill="currentColor" />
              ) : (
                <Play className="w-3.5 h-3.5 text-foreground" fill="currentColor" />
              )}
            </button>
          </>
        ) : (
          <>
            {isActive && isPlaying ? (
              <div className="flex items-end gap-[2px] h-[14px]">
                <div className="eq-bar eq-bar-1" />
                <div className="eq-bar eq-bar-2" />
                <div className="eq-bar eq-bar-3" />
              </div>
            ) : (
              <button
                onClick={handlePlay}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-100"
              >
                <Play className="w-3.5 h-3.5" fill="currentColor" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Artwork */}
      {showArtwork && (
        <Artwork
          src={formatArtworkUrl(artworkUrl, 80)}
          alt={name}
          size={36}
          rounded="sm"
        />
      )}

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-[13px] font-medium line-clamp-1 leading-tight',
            isActive && 'text-primary',
          )}
        >
          {name}
        </p>
        <p className="text-[12px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
          {artistName}
        </p>
      </div>

      {/* Album name */}
      {showAlbum && albumName && (
        <div className="hidden md:block flex-1 min-w-0 max-w-[200px]">
          <p className="text-[12px] text-muted-foreground/70 line-clamp-1">
            {albumName}
          </p>
        </div>
      )}

      {/* Duration */}
      <div className="w-11 text-right flex-shrink-0">
        <span className="text-[12px] tabular-nums text-muted-foreground/70">
          {formatDuration(duration)}
        </span>
      </div>

      {/* More actions */}
      <div className="w-7 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-100 p-1 rounded-md hover:bg-accent/60">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => playNext(id)}>
              <ListPlus className="w-4 h-4 mr-2" />
              Play Next
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addToQueue(id)}>
              <ListEnd className="w-4 h-4 mr-2" />
              Add to Queue
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Heart className="w-4 h-4 mr-2" />
              Add to Favorites
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
