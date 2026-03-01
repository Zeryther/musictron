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
        'group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer',
        isActive && 'bg-accent/30',
        className,
      )}
      onDoubleClick={handlePlay}
    >
      {/* Track number or play icon */}
      <div className="w-8 flex items-center justify-center flex-shrink-0">
        {showTrackNumber ? (
          <>
            <span className={cn('text-sm text-muted-foreground group-hover:hidden', isActive && 'text-primary')}>
              {trackNumber}
            </span>
            <button
              onClick={handlePlay}
              className="hidden group-hover:block"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-primary" fill="currentColor" />
              ) : (
                <Play className="w-4 h-4 text-foreground" fill="currentColor" />
              )}
            </button>
          </>
        ) : (
          <>
            {isActive && isPlaying ? (
              <div className="flex items-center gap-[2px]">
                <div className="w-[3px] h-3 bg-primary rounded-full animate-pulse" />
                <div className="w-[3px] h-4 bg-primary rounded-full animate-pulse [animation-delay:0.15s]" />
                <div className="w-[3px] h-2 bg-primary rounded-full animate-pulse [animation-delay:0.3s]" />
              </div>
            ) : (
              <button
                onClick={handlePlay}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Play className="w-4 h-4" fill="currentColor" />
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
          size={40}
          rounded="sm"
        />
      )}

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium line-clamp-1', isActive && 'text-primary')}>
          {name}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {artistName}
        </p>
      </div>

      {/* Album name */}
      {showAlbum && albumName && (
        <div className="hidden md:block flex-1 min-w-0 max-w-[200px]">
          <p className="text-xs text-muted-foreground line-clamp-1">
            {albumName}
          </p>
        </div>
      )}

      {/* Duration */}
      <div className="w-12 text-right flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>

      {/* More actions */}
      <div className="w-8 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
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
