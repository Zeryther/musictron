import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { PlayerBar } from '../player/player-bar'
import { QueuePanel } from '../player/queue-panel'
import { FullscreenPlayer } from '../player/fullscreen-player'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePlayerStore } from '@/stores/player-store'

export function MainLayout() {
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen)
  const isFullscreen = usePlayerStore((s) => s.isFullscreen)

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <Sidebar />

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
