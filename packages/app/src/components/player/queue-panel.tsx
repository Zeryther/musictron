import React from 'react'
import { formatTime } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Artwork } from '@/components/ui/artwork'
import { Button } from '@/components/ui/button'
import { usePlayerStore } from '@/stores/player-store'
import { X, Music } from 'lucide-react'

export function QueuePanel() {
  const { queue, queuePosition, nowPlaying, toggleQueue } = usePlayerStore()

  const upNext = queue.slice(queuePosition + 1)

  return (
    <div className="w-[300px] border-l border-white/[0.06] flex flex-col surface-glass-heavy animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <h3 className="font-semibold text-[13px]">Queue</h3>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground/50 hover:text-foreground"
          onClick={toggleQueue}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Now Playing */}
          {nowPlaying && (
            <div className="mb-5">
              <h4 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-2 mb-2">
                Now Playing
              </h4>
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-primary/[0.06]">
                <Artwork
                  src={nowPlaying.artworkUrl}
                  alt={nowPlaying.name}
                  size={40}
                  rounded="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium line-clamp-1 text-primary leading-tight">
                    {nowPlaying.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
                    {nowPlaying.artistName}
                  </p>
                </div>
                <span className="text-[11px] tabular-nums text-muted-foreground/50">
                  {formatTime(nowPlaying.duration)}
                </span>
              </div>
            </div>
          )}

          {/* Up Next */}
          <div>
            <h4 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-2 mb-2">
              Up Next{upNext.length > 0 && ` (${upNext.length})`}
            </h4>
            {upNext.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
                <Music className="w-7 h-7 mb-2" />
                <p className="text-[13px]">Queue is empty</p>
              </div>
            ) : (
              <div className="space-y-px">
                {upNext.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex items-center gap-3 px-2 py-[6px] rounded-lg hover:bg-white/[0.04] transition-colors duration-100 cursor-pointer"
                  >
                    <span className="text-[11px] tabular-nums text-muted-foreground/40 w-4 text-right">
                      {index + 1}
                    </span>
                    <Artwork
                      src={item.artworkUrl}
                      alt={item.name}
                      size={32}
                      rounded="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] line-clamp-1 leading-tight">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 line-clamp-1 leading-tight mt-0.5">
                        {item.artistName}
                      </p>
                    </div>
                    <span className="text-[11px] tabular-nums text-muted-foreground/40">
                      {formatTime(item.duration)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
