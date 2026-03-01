import React from 'react'
import { cn, formatArtworkUrl } from '@/lib/utils'
import { Artwork } from './artwork'
import { Play } from 'lucide-react'
import { usePlayerStore } from '@/stores/player-store'

interface MediaCardProps {
  id: string
  type: 'album' | 'playlist' | 'station'
  name: string
  subtitle?: string
  artworkUrl?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function MediaCard({
  id,
  type,
  name,
  subtitle,
  artworkUrl,
  className,
  size = 'md',
  onClick,
}: MediaCardProps) {
  const { playAlbum, playPlaylist } = usePlayerStore()

  const sizeMap = {
    sm: 140,
    md: 180,
    lg: 220,
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
        'group cursor-pointer flex flex-col gap-2',
        className,
      )}
      style={{ width: sizeMap[size] }}
      onClick={onClick}
    >
      <div className="relative">
        <Artwork
          src={formatArtworkUrl(artworkUrl, sizeMap[size] * 2)}
          alt={name}
          size={sizeMap[size]}
          rounded={type === 'playlist' ? 'md' : 'md'}
          shadow
        />
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 shadow-lg hover:bg-primary hover:scale-105"
        >
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        </button>
      </div>
      <div className="min-w-0 px-0.5">
        <p className="text-sm font-medium line-clamp-1">{name}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
