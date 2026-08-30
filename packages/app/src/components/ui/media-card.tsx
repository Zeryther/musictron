import React from 'react'
import { cn, formatArtworkUrl } from '@/lib/utils'
import { Artwork } from './artwork'
import { Play } from 'lucide-react'
import { usePlayerStore } from '@/stores/player-store'

interface MediaCardProps {
  id: string
  type: 'album' | 'playlist' | 'station'
  name?: string
  subtitle?: string
  artworkUrl?: string
  className?: string
  /** Fixed rem widths for carousels; 'fluid' fills the grid cell. */
  size?: 'sm' | 'md' | 'lg' | 'fluid'
  onClick?: () => void
}

export function MediaCard({
  id,
  type,
  name,
  subtitle,
  artworkUrl,
  className,
  size = 'fluid',
  onClick,
}: MediaCardProps) {
  const { playAlbum, playPlaylist } = usePlayerStore()

  const widthClasses = {
    sm: 'w-[9.25rem]',
    md: 'w-[11.25rem]',
    lg: 'w-[13.75rem]',
    fluid: 'w-full',
  }

  // Only used to request an appropriately sized image from the artwork CDN
  const artworkResolution = {
    sm: 296,
    md: 360,
    lg: 440,
    fluid: 440,
  }

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (type === 'album') {
      playAlbum(id)
    } else if (type === 'playlist') {
      playPlaylist(id)
    }
  }

  return (
    <div
      className={cn(
        'group cursor-pointer flex flex-col gap-2 shrink-0',
        widthClasses[size],
        className,
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="relative rounded-xl overflow-hidden">
        <Artwork
          src={formatArtworkUrl(artworkUrl, artworkResolution[size])}
          alt={name}
          rounded="none"
          shadow
        />
        {/* Hover overlay with play button */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
        <button
          onClick={handlePlay}
          aria-label={`Play ${name ?? 'item'}`}
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 shadow-lg shadow-black/30 hover:bg-white hover:scale-105 active:scale-95"
        >
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        </button>
      </div>
      <div className="min-w-0 px-0.5">
        <p className="text-sm font-medium line-clamp-1 leading-tight">
          {name}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 leading-tight">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
