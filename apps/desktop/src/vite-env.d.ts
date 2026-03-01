/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    getPlatform: () => Promise<string>
    getTheme: () => Promise<string>
    setTitle: (title: string) => void
    windowMinimize: () => Promise<void>
    windowMaximize: () => Promise<void>
    windowIsMaximized: () => Promise<boolean>
    windowClose: () => Promise<void>
    onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void
    onMediaKey: (callback: (key: string) => void) => () => void
  }
}
