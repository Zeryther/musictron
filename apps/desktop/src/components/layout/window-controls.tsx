import React, { useEffect, useState } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

/**
 * Custom window controls (minimize, maximize/restore, close) for Windows and Linux.
 * On macOS, the native traffic lights are used instead and this component renders nothing.
 */
export function WindowControls() {
  const [platform, setPlatform] = useState<string>('linux')
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.getPlatform().then(setPlatform)
    window.electronAPI.windowIsMaximized().then(setIsMaximized)

    const cleanup = window.electronAPI.onWindowMaximizedChange(setIsMaximized)
    return cleanup
  }, [])

  // Don't render on macOS — native traffic lights are used
  if (platform === 'darwin') return null

  return (
    <div className="flex items-center no-drag">
      <button
        onClick={() => window.electronAPI.windowMinimize()}
        className="inline-flex items-center justify-center w-[46px] h-8 hover:bg-white/10 transition-colors"
        aria-label="Minimize"
      >
        <Minus className="w-4 h-4 text-foreground/80" />
      </button>
      <button
        onClick={() => window.electronAPI.windowMaximize()}
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
        onClick={() => window.electronAPI.windowClose()}
        className="inline-flex items-center justify-center w-[46px] h-8 hover:bg-red-500 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4 text-foreground/80" />
      </button>
    </div>
  )
}
