import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Music } from 'lucide-react'

interface ArtworkProps {
  src?: string
  alt?: string
  /** Size in px at 100% UI scale; omit to fill the parent (w-full aspect-square). */
  size?: number
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full' | 'none'
  shadow?: boolean
  onClick?: () => void
}

export function Artwork({
  src,
  alt = 'Artwork',
  size,
  className,
  rounded = 'md',
  shadow = false,
  onClick,
}: ArtworkProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const roundedClasses = {
    none: '',
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted/80 flex-shrink-0',
        size === undefined && 'w-full aspect-square',
        roundedClasses[rounded],
        shadow && 'shadow-xl shadow-black/40',
        onClick && 'cursor-pointer group/artwork',
        className,
      )}
      // rem so the artwork follows the user's UI scale (dynamic value → inline style)
      style={
        size !== undefined
          ? { width: `${size / 16}rem`, height: `${size / 16}rem` }
          : undefined
      }
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {!error && src ? (
        <>
          {!loaded && <div className="absolute inset-0 artwork-loading" />}
          <img
            src={src}
            alt={alt}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-500',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            draggable={false}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Music className="w-1/3 h-1/3 text-muted-foreground/70" />
        </div>
      )}

      {onClick && (
        <div className="absolute inset-0 bg-black/0 group-hover/artwork:bg-black/10 transition-colors duration-200" />
      )}
    </div>
  )
}
