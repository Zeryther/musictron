import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTitle: (title: string) => ipcRenderer.send('set-title', title),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window-maximized-change', (_event, isMaximized) =>
      callback(isMaximized),
    )
    return () => {
      ipcRenderer.removeAllListeners('window-maximized-change')
    }
  },
  onMediaKey: (callback: (key: string) => void) => {
    ipcRenderer.on('media-key', (_event, key) => callback(key))
    return () => {
      ipcRenderer.removeAllListeners('media-key')
    }
  },
})
