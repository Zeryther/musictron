import { useEffect } from 'react'
import { usePlayerStore } from '@/stores/player-store'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = usePlayerStore.getState()
      const target = e.target as HTMLElement

      // Don't handle shortcuts when typing in input fields
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          store.togglePlayPause()
          break
        case 'ArrowRight':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            store.skipNext()
          }
          break
        case 'ArrowLeft':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            store.skipPrevious()
          }
          break
        case 'ArrowUp':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            store.setVolume(Math.min(1, store.volume + 0.05))
          }
          break
        case 'ArrowDown':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            store.setVolume(Math.max(0, store.volume - 0.05))
          }
          break
        case 'KeyM':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            store.setVolume(store.volume === 0 ? 0.5 : 0)
          }
          break
        case 'KeyQ':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            store.toggleQueue()
          }
          break
        case 'KeyF':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            // Focus search - handled by SearchPage
          }
          break
        case 'Escape':
          if (store.isFullscreen) {
            store.setFullscreen(false)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
