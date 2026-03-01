import React, { useEffect, useState } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'
import { getPlatformAdapter } from '@/lib/platform'

/**
 * Custom window controls (minimize, maximize/restore, close) for Windows and Linux.
 * On macOS the native traffic lights are used; on the web this component is never
 * rendered (the parent layout guards it).
 */
export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const adapter = getPlatformAdapter()
    adapter.windowIsMaximized?.().then(setIsMaximized)

    const cleanup = adapter.onWindowMaximizedChange?.(setIsMaximized)
    return cleanup
  }, [])

  const adapter = getPlatformAdapter()

  // If the platform adapter doesn't expose window controls, render nothing.
  if (!adapter.windowMinimize) return null

  return (
    <div className="flex items-center no-drag">
      <button
        onClick={() => adapter.windowMinimize?.()}
        className="inline-flex items-center justify-center w-[46px] h-8 hover:bg-white/10 transition-colors"
        aria-label="Minimize"
      >
        <Minus className="w-4 h-4 text-foreground/80" />
      </button>
      <button
        onClick={() => adapter.windowMaximize?.()}
        className="inline-flex items-center justify-center w-[46px] h-8 hover:bg-white/10 transition-colors"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <Copy className="w-3.5 h-3.5 text-foreground/80 rotate-180" />
        ) : (
          <Square className="w-3 h-3 text-foreground/80" />
        )}
      </button>
      <button
        onClick={() => adapter.windowClose?.()}
        className="inline-flex items-center justify-center w-[46px] h-8 hover:bg-red-500 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4 text-foreground/80" />
      </button>
    </div>
  )
}
