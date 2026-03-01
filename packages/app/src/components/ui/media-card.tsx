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
    sm: 148,
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
      <div className="relative rounded-xl overflow-hidden">
        <Artwork
          src={formatArtworkUrl(artworkUrl, sizeMap[size] * 2)}
          alt={name}
          size={sizeMap[size]}
          rounded="none"
          shadow
        />
        {/* Hover overlay with play button */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 shadow-lg shadow-black/30 hover:bg-white hover:scale-105 active:scale-95"
        >
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        </button>
      </div>
      <div className="min-w-0 px-0.5">
        <p className="text-[13px] font-medium line-clamp-1 leading-tight">
          {name}
        </p>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5 leading-tight">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
