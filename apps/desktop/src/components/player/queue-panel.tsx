import React from 'react'
import { cn, formatTime } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Artwork } from '@/components/ui/artwork'
import { Button } from '@/components/ui/button'
import { usePlayerStore } from '@/stores/player-store'
import { X, Music } from 'lucide-react'

export function QueuePanel() {
  const { queue, queuePosition, nowPlaying, toggleQueue } = usePlayerStore()

  const upNext = queue.slice(queuePosition + 1)

  return (
    <div className="w-[320px] border-l border-border/50 flex flex-col bg-background/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="font-semibold text-sm">Queue</h3>
        <Button variant="ghost" size="icon-sm" onClick={toggleQueue}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Now Playing */}
          {nowPlaying && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                Now Playing
              </h4>
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-accent/30">
                <Artwork
                  src={nowPlaying.artworkUrl}
                  alt={nowPlaying.name}
                  size={40}
                  rounded="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-1 text-primary">
                    {nowPlaying.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {nowPlaying.artistName}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTime(nowPlaying.duration)}
                </span>
              </div>
            </div>
          )}

          {/* Up Next */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Up Next ({upNext.length})
            </h4>
            {upNext.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Music className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Queue is empty</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {upNext.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors cursor-pointer group"
                  >
                    <span className="text-xs text-muted-foreground w-5 text-right">
                      {index + 1}
                    </span>
                    <Artwork
                      src={item.artworkUrl}
                      alt={item.name}
                      size={32}
                      rounded="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.artistName}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
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
