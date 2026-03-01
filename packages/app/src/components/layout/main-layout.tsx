import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { WindowControls } from './window-controls'
import { PlayerBar } from '../player/player-bar'
import { QueuePanel } from '../player/queue-panel'
import { FullscreenPlayer } from '../player/fullscreen-player'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePlayerStore } from '@/stores/player-store'
import { getPlatformAdapter } from '@/lib/platform'

export function MainLayout() {
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen)
  const isFullscreen = usePlayerStore((s) => s.isFullscreen)
  const [platform, setPlatform] = useState<string>('web')

  useEffect(() => {
    getPlatformAdapter().getPlatform().then(setPlatform)
  }, [])

  const isDesktop = platform === 'darwin' || platform === 'win32' || platform === 'linux'
  const isMac = platform === 'darwin'
  const showTitleBar = isDesktop && !isMac

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Windows/Linux desktop: custom title bar with drag region and window controls */}
      {showTitleBar && (
        <div className="flex items-center justify-between h-8 bg-background/50 border-b border-border/30 drag-region shrink-0">
          <div className="flex items-center gap-2 px-4 no-drag">
            <span className="text-xs font-medium text-muted-foreground">Musictron</span>
          </div>
          <WindowControls />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <Sidebar platform={platform} />

        {/* Content */}
        <main className="flex-1 min-w-0 flex">
          <ScrollArea className="flex-1">
            <div className="p-6 pb-8">
              <Outlet />
            </div>
          </ScrollArea>

          {/* Queue Panel */}
          {isQueueOpen && <QueuePanel />}
        </main>
      </div>

      {/* Player Bar */}
      <PlayerBar />

      {/* Fullscreen Player */}
      {isFullscreen && <FullscreenPlayer />}
    </div>
  )
}
